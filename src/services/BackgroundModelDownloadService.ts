import RNBackgroundDownloader, { DownloadTask } from '@kesha-antonov/react-native-background-downloader';
import notifee, { AndroidImportance, AndroidColor, EventType } from '@notifee/react-native';
import RNBlobUtil from 'react-native-blob-util';
import { getModelDownloadUrl } from '../utils/constants';
import {
  BackgroundDownloadGroupState,
  BackgroundDownloadFileState,
  loadBackgroundDownloadGroups,
  upsertBackgroundDownloadGroup,
  loadBackgroundDownloadPreferences,
} from '../utils/storage';

type FileInput = { filename: string; label?: string };

export interface EnqueueInput {
  id: string
  title: string
  repo: string
  files: FileInput[]
  wifiOnly?: boolean
  concurrency?: number
}

export type GroupProgress = {
  groupId: string
  written: number
  total: number
  percentage: number
  byFile: Record<string, { written: number; total: number; percentage: number }>
}

type Subscriber = (p: GroupProgress) => void;

// Internal helper to throttle function calls
function throttle<T extends (...args: any[]) => any>(fn: T, intervalMs: number): T {
  let lastTime = 0;
  let timeout: NodeJS.Timeout | null = null;
  let pendingArgs: any[] | null = null;
  const invoke = (args: any[]) => {
    lastTime = Date.now();
    fn(...args);
  };
  // @ts-ignore
  return function(this: any, ...args: any[]) {
    const now = Date.now();
    const remaining = intervalMs - (now - lastTime);
    if (remaining <= 0) {
      if (timeout) { clearTimeout(timeout); timeout = null; }
      invoke(args);
    } else {
      pendingArgs = args;
      if (!timeout) {
        timeout = setTimeout(() => {
          timeout = null;
          if (pendingArgs) { invoke(pendingArgs); pendingArgs = null; }
        }, remaining);
      }
    }
  } as T;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) { return '0 B'; }
  const k = 1024; const sizes = ['B','KB','MB','GB','TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

function detectSplitFile(filename: string): { baseName: string; currentPart: number; totalParts: number; padding: number } | null {
  const match = filename.match(/^(.+)-(\d+)-of-(\d+)\.gguf$/);
  if (!match) { return null; }
  const baseName = match[1]!;
  const currentPartStr = match[2]!;
  const totalPartsStr = match[3]!;
  return {
    baseName,
    currentPart: parseInt(currentPartStr, 10),
    totalParts: parseInt(totalPartsStr, 10),
    padding: Math.max(5, Math.max(currentPartStr.length, totalPartsStr.length)),
  };
}

function generateSplitFilenames(filename: string): string[] {
  const info = detectSplitFile(filename);
  if (!info) { return [filename]; }
  const { baseName, totalParts, padding } = info;
  const parts: string[] = [];
  for (let i = 1; i <= totalParts; i += 1) {
    const p = i.toString().padStart(padding, '0');
    parts.push(`${baseName}-${p}-of-${totalParts.toString().padStart(padding, '0')}.gguf`);
  }
  return parts;
}

class BackgroundModelDownloadService {
  private subscribers: Map<string, Set<Subscriber>> = new Map();
  private groupTasks: Map<string, Map<string, DownloadTask>> = new Map(); // groupId -> filename -> task
  private notificationIds: Map<string, string> = new Map(); // groupId -> notificationId

  async ensureChannel(): Promise<void> {
    await notifee.createChannel({ id: 'model-downloads', name: 'Model Downloads', importance: AndroidImportance.LOW, lights: false, vibration: false });
  }

  private async ensureModelsDir(): Promise<void> {
    const dir = `${RNBlobUtil.fs.dirs.DocumentDir}/models`;
    const exists = await RNBlobUtil.fs.exists(dir);
    if (!exists) { await RNBlobUtil.fs.mkdir(dir); }
  }

  private getTaskId(groupId: string, filename: string): string { return `bgdl-${groupId}-${filename}`; }

  private async preflightSizes(repo: string, filenames: string[]): Promise<Record<string, number>> {
    const results: Record<string, number> = {};
    await Promise.all(filenames.map(async (fn) => {
      try {
        const url = getModelDownloadUrl(repo, fn);
        const res = await RNBlobUtil.fetch('GET', url, { 'Range': 'bytes=0-0' });
        const headers = res.info().headers as Record<string, string>;
        const contentRange = headers['content-range'] || headers['Content-Range'];
        if (contentRange) {
          const m = contentRange.match(/\/(\d+)$/);
          if (m) { results[fn] = parseInt(m[1]!, 10); return; }
        }
        const cl = headers['content-length'] || headers['Content-Length'];
        results[fn] = cl ? parseInt(cl, 10) : 0;
      } catch { results[fn] = 0; }
    }));
    return results;
  }

  private aggregate(group: BackgroundDownloadGroupState): GroupProgress {
    const byFile: GroupProgress['byFile'] = {};
    let written = 0; let total = 0;
    Object.values(group.files).forEach(f => { written += f.written; total += f.total; byFile[f.filename] = { written: f.written, total: f.total, percentage: f.total ? Math.round((f.written / f.total) * 100) : 0 }; });
    const percentage = total ? Math.min(100, Math.round((written / total) * 100)) : 0;
    return { groupId: group.id, written, total, percentage, byFile };
  }

  private notifySubscribers(group: BackgroundDownloadGroupState): void {
    const progress = this.aggregate(group);
    const set = this.subscribers.get(group.id);
    if (set) { set.forEach(cb => cb(progress)); }
  }

  private displayOrUpdateNotification = throttle(async (group: BackgroundDownloadGroupState) => {
    await this.ensureChannel();
    const progress = this.aggregate(group);
    const notifId = this.notificationIds.get(group.id) || group.id;
    const isComplete = group.status === 'completed';
    const isFailed = group.status === 'failed' || group.status === 'canceled';

    const actions: import('@notifee/react-native').AndroidAction[] | undefined = isComplete
      ? undefined
      : isFailed
        ? [{ title: 'Retry', pressAction: { id: `retry-${group.id}` } }]
        : [
            { title: 'Pause', pressAction: { id: `pause-${group.id}` } },
            { title: 'Resume', pressAction: { id: `resume-${group.id}` } },
            { title: 'Cancel', pressAction: { id: `cancel-${group.id}` } },
          ];

    await notifee.displayNotification({
      id: notifId,
      title: isComplete ? `${group.title} ready` : (isFailed ? `${group.title} failed` : `Downloading ${group.title}`),
      body: isComplete ? 'Download complete' : `${formatBytes(progress.written)} / ${formatBytes(progress.total)}`,
      android: {
        channelId: 'model-downloads',
        smallIcon: 'ic_launcher',
        color: '#1E88E5' as unknown as AndroidColor,
        ongoing: !isComplete && !isFailed,
        onlyAlertOnce: true,
        progress: isComplete || isFailed ? undefined : { max: 100, current: progress.percentage, indeterminate: progress.total === 0 },
        actions,
      },
    });
    this.notificationIds.set(group.id, notifId);
  }, 750);

  private async updateGroupAndNotify(group: BackgroundDownloadGroupState): Promise<void> {
    const aggregated = this.aggregate(group);
    group.writtenBytes = aggregated.written;
    group.totalBytes = aggregated.total;
    group.percentage = aggregated.percentage;
    group.updatedAt = Date.now();
    await upsertBackgroundDownloadGroup(group);
    this.notifySubscribers(group);
    await this.displayOrUpdateNotification(group);
  }

  private async onTaskDone(group: BackgroundDownloadGroupState, filename: string): Promise<void> {
    const dir = `${RNBlobUtil.fs.dirs.DocumentDir}/models`;
    const tmpPath = `${dir}/${filename}.tmp`;
    const finalPath = `${dir}/${filename}`;
    try {
      const exists = await RNBlobUtil.fs.exists(tmpPath);
      if (exists) {
        // Validate size if we have expected total
        const stat = await RNBlobUtil.fs.stat(tmpPath);
        const actual = parseInt(stat.size.toString(), 10);
        const expected = group.files[filename]?.total || 0;
        if (expected > 0 && actual > 0 && actual !== expected) {
          // Corrupt/incomplete; delete temp and mark file failed
          try { await RNBlobUtil.fs.unlink(tmpPath); } catch {}
          const f = group.files[filename];
          if (f) { f.status = 'failed'; f.errorMessage = `Size mismatch: ${actual} != ${expected}`; }
          group.status = 'failed';
          await this.updateGroupAndNotify(group);
          return;
        }
        await RNBlobUtil.fs.mv(tmpPath, finalPath);
      }
    } catch {}
    // Mark file completed
    const file = group.files[filename];
    if (file) { file.status = 'completed'; file.percentage = 100; file.written = file.total; }
    // If all files completed, mark group completed
    const allDone = Object.values(group.files).every(f => f.status === 'completed');
    if (allDone) { group.status = 'completed'; }
    await this.updateGroupAndNotify(group);
  }

  private async onTaskError(group: BackgroundDownloadGroupState, filename: string, error: any): Promise<void> {
    const file = group.files[filename];
    if (file) { file.status = 'failed'; file.errorMessage = (error && error.message) ? String(error.message) : 'Download failed'; }
    group.status = 'failed';
    await this.updateGroupAndNotify(group);
  }

  async enqueueGroup(input: EnqueueInput): Promise<string> {
    await this.ensureModelsDir();
    await this.ensureChannel();

    // Expand split files
    const expandedFiles: FileInput[] = [];
    input.files.forEach(f => {
      const parts = generateSplitFilenames(f.filename);
      parts.forEach(p => expandedFiles.push({ filename: p, label: f.label }));
    });

    // Preflight sizes
    const sizes = await this.preflightSizes(input.repo, expandedFiles.map(f => f.filename));
    // Space preflight: warn if free space < expected total
    const expectedTotal = Object.values(sizes).reduce((a, b) => a + (b || 0), 0);
    try {
      const df = await RNBlobUtil.fs.df();
      const free = Number(df.free || df.internal_free || df.external_free || 0);
      if (free && expectedTotal && free < expectedTotal) {
        // Show a warning notification but proceed (user can cancel)
        await notifee.displayNotification({
          title: 'Low storage warning',
          body: `Expected ${formatBytes(expectedTotal)} but only ${formatBytes(free)} free. Download may fail.`,
          android: { channelId: 'model-downloads', smallIcon: 'ic_launcher' },
        });
      }
    } catch {}

    const now = Date.now();
    const group: BackgroundDownloadGroupState = {
      id: input.id,
      title: input.title,
      repo: input.repo,
      wifiOnly: input.wifiOnly,
      concurrency: input.concurrency ?? (await loadBackgroundDownloadPreferences()).maxConcurrency,
      createdAt: now,
      updatedAt: now,
      status: 'queued',
      totalBytes: 0,
      writtenBytes: 0,
      percentage: 0,
      files: {},
    };

    expandedFiles.forEach(f => {
      group.files[f.filename] = {
        filename: f.filename,
        label: f.label,
        written: 0,
        total: sizes[f.filename] ?? 0,
        percentage: 0,
        status: 'queued',
      } as BackgroundDownloadFileState;
    });

    await upsertBackgroundDownloadGroup(group);
    this.notifySubscribers(group);
    await this.displayOrUpdateNotification(group);

    // Start downloads with simple concurrency control
    group.status = 'running';
    await this.updateGroupAndNotify(group);

    const maxConcurrency = Math.max(1, Math.min(3, group.concurrency || 1));
    const filenames = Object.keys(group.files);
    const queue = filenames.slice();
    const running = new Set<string>();
    const startNext = async () => {
      if (queue.length === 0) { return; }
      if (running.size >= maxConcurrency) { return; }
      const next = queue.shift()!;
      running.add(next);
      await this.startSingleFileDownload(group, next).finally(() => { running.delete(next); startNext(); });
    };
    // Prime concurrent downloads
    const starters = Array.from({ length: maxConcurrency }).map(() => startNext());
    await Promise.all(starters);

    return group.id;
  }

  private async startSingleFileDownload(group: BackgroundDownloadGroupState, filename: string): Promise<void> {
    const dir = `${RNBlobUtil.fs.dirs.DocumentDir}/models`;
    const url = getModelDownloadUrl(group.repo, filename);
    const destination = `${dir}/${filename}.tmp`;
    const taskId = this.getTaskId(group.id, filename);

    // Ensure parent dir exists
    await this.ensureModelsDir();

    await loadBackgroundDownloadPreferences();
    const task = RNBackgroundDownloader.download({
      id: taskId,
      url,
      destination,
      isAllowedOverRoaming: !group.wifiOnly,
      isAllowedOverMetered: !group.wifiOnly,
      isNotificationVisible: true,
      notificationTitle: `Downloading ${group.title}`,
      headers: {},
      metadata: { groupId: group.id, filename },
    });
    if (!this.groupTasks.has(group.id)) { this.groupTasks.set(group.id, new Map()); }
    this.groupTasks.get(group.id)!.set(filename, task);

    const fileState = group.files[filename];
    fileState.status = 'running';
    await this.updateGroupAndNotify(group);

    task.begin(({ expectedBytes }) => {
      fileState.total = (expectedBytes as unknown as number) || fileState.total || 0;
      this.updateGroupAndNotify(group);
    });
    task.progress(({ bytesDownloaded, bytesTotal }) => {
      const total = (bytesTotal as unknown as number) || fileState.total || 0;
      const written = total ? Math.min(total, bytesDownloaded as unknown as number) : (bytesDownloaded as unknown as number);
      fileState.written = written;
      fileState.total = total;
      fileState.percentage = total ? Math.round((written / total) * 100) : fileState.percentage;
      this.updateGroupAndNotify(group);
    });
    task.done(() => this.onTaskDone(group, filename));
    task.error(err => this.onTaskError(group, filename, err));
  }

  subscribe(groupId: string, cb: Subscriber): () => void {
    const set = this.subscribers.get(groupId) || new Set<Subscriber>();
    set.add(cb); this.subscribers.set(groupId, set);
    return () => { const current = this.subscribers.get(groupId); if (current) { current.delete(cb); if (current.size === 0) { this.subscribers.delete(groupId); } } };
  }

  async pause(groupId: string): Promise<void> {
    const tasks = this.groupTasks.get(groupId);
    if (tasks) { tasks.forEach(t => t.pause()); }
    const groups = await loadBackgroundDownloadGroups();
    const group = groups.find(g => g.id === groupId);
    if (group) {
      group.status = 'paused';
      Object.values(group.files).forEach(f => { if (f.status === 'running') { f.status = 'paused'; } });
      await this.updateGroupAndNotify(group);
    }
  }

  async resume(groupId: string): Promise<void> {
    const tasks = this.groupTasks.get(groupId);
    const groups = await loadBackgroundDownloadGroups();
    const group = groups.find(g => g.id === groupId);
    if (!group) { return; }
    group.status = 'running';
    await this.updateGroupAndNotify(group);

    if (tasks && tasks.size > 0) {
      tasks.forEach(t => t.resume());
    } else {
      // Recreate tasks for queued/paused files
      const pending = Object.values(group.files).filter(f => f.status !== 'completed');
      // Simple sequential resume with concurrency
      const maxConcurrency = Math.max(1, Math.min(3, group.concurrency || 1));
      const queue = pending.map(f => f.filename);
      const running = new Set<string>();
      const startNext = async () => {
        if (queue.length === 0) { return; }
        if (running.size >= maxConcurrency) { return; }
        const next = queue.shift()!;
        running.add(next);
        await this.startSingleFileDownload(group, next).finally(() => { running.delete(next); startNext(); });
      };
      const starters = Array.from({ length: maxConcurrency }).map(() => startNext());
      await Promise.all(starters);
    }
  }

  async cancel(groupId: string): Promise<void> {
    const tasks = this.groupTasks.get(groupId);
    if (tasks) { tasks.forEach(t => t.stop()); this.groupTasks.delete(groupId); }
    const groups = await loadBackgroundDownloadGroups();
    const group = groups.find(g => g.id === groupId);
    if (group) {
      group.status = 'canceled';
      Object.values(group.files).forEach(f => { f.status = 'canceled'; });
      await this.updateGroupAndNotify(group);
    }
    // Cleanup temp files
    if (group) {
      const dir = `${RNBlobUtil.fs.dirs.DocumentDir}/models`;
      await Promise.all(Object.keys(group.files).map(async fn => {
        try { await RNBlobUtil.fs.unlink(`${dir}/${fn}.tmp`); } catch {}
      }));
    }
  }

  async status(groupId: string): Promise<'queued' | 'running' | 'paused' | 'completed' | 'failed'> {
    const groups = await loadBackgroundDownloadGroups();
    const group = groups.find(g => g.id === groupId);
    return (group ? group.status : 'queued') as any;
  }

  async rehydrate(): Promise<void> {
    await this.ensureChannel();
    await this.ensureModelsDir();
    // Reattach to existing native tasks
    const tasks = await RNBackgroundDownloader.checkForExistingDownloads();
    const groups = await loadBackgroundDownloadGroups();
    const groupById: Record<string, BackgroundDownloadGroupState> = Object.fromEntries(groups.map(g => [g.id, g]));

    tasks.forEach(task => {
      const id = task.id || '';
      // Expect id format: bgdl-<groupId>-<filename>
      const m = id.match(/^bgdl-(.+)-(.+)$/);
      if (!m) { return; }
      const groupId = m[1]!; const filename = m[2]!;
      const group = groupById[groupId];
      if (!group) { return; }
      if (!this.groupTasks.has(groupId)) { this.groupTasks.set(groupId, new Map()); }
      this.groupTasks.get(groupId)!.set(filename, task);
      const fileState = group.files[filename];
      if (fileState) { fileState.status = 'running'; }
      task.begin(({ expectedBytes }) => { if (fileState) { fileState.total = (expectedBytes as unknown as number) || fileState.total || 0; this.updateGroupAndNotify(group); } });
      task.progress(({ bytesDownloaded, bytesTotal }) => { if (fileState) { const total = (bytesTotal as unknown as number) || fileState.total || 0; const written = total ? Math.min(total, bytesDownloaded as unknown as number) : (bytesDownloaded as unknown as number); fileState.written = written; fileState.total = total; fileState.percentage = total ? Math.round((written / total) * 100) : fileState.percentage; this.updateGroupAndNotify(group); } });
      task.done(() => this.onTaskDone(group, filename));
      task.error(err => this.onTaskError(group, filename, err));
    });

    // Update notifications for active groups
    await Promise.all(Object.values(groupById).map(g => this.displayOrUpdateNotification(g)));

    // Listen to notifee action events
    notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.ACTION_PRESS && detail.pressAction) {
        const id = detail.pressAction.id || '';
        const m = id.match(/^(pause|resume|cancel|retry)-(.+)$/);
        if (!m) { return; }
        const action = m[1]!; const groupId = m[2]!;
        if (action === 'pause') { this.pause(groupId); }
        if (action === 'resume') { this.resume(groupId); }
        if (action === 'cancel') { this.cancel(groupId); }
        if (action === 'retry') {
          // Re-enqueue using stored group state
          loadBackgroundDownloadGroups().then(groups => {
            const g = groups.find(x => x.id === groupId);
            if (g) {
              const files = Object.keys(g.files).map(fn => ({ filename: fn, label: g.files[fn]?.label }));
              this.enqueueGroup({ id: g.id, title: g.title, repo: g.repo, files, wifiOnly: g.wifiOnly, concurrency: g.concurrency || 1 });
            }
          }).catch(() => {});
        }
      }
    });
  }
}

export default new BackgroundModelDownloadService();

