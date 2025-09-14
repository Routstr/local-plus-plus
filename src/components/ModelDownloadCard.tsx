
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import BackgroundModelDownloadService from '../services/BackgroundModelDownloadService';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { useTheme } from '../contexts/ThemeContext';

// Common interfaces and types
interface ModelFile {
  repo: string
  filename: string
  size?: string
  label?: string // For display purposes (e.g., "TTS model", "vocoder")
}

interface BaseModelDownloadCardProps {
  title: string
  size: string
  files: ModelFile[] // Array of files to download
  onInitialize?: (...paths: string[]) => void
  onDownloaded?: (...paths: string[]) => void
  downloadButtonText?: string
  initializeButtonText?: string
  isLocalFile?: boolean
  hideInitializeButton?: boolean
}

interface ModelDownloadCardProps {
  title: string
  repo: string
  filename: string
  size: string
  onDownloaded?: (path: string) => void
  onInitialize?: (path: string) => void
  initializeButtonText?: string
  isLocalFile?: boolean
  hideInitializeButton?: boolean
}

interface TTSModelDownloadCardProps {
  title: string
  repo: string
  filename: string
  size: string
  vocoder: {
    repo: string
    filename: string
    size: string
  }
  onInitialize: (ttsPath: string, vocoderPath: string) => void
  onDownloaded?: (ttsPath: string, vocoderPath: string) => void
  initializeButtonText?: string
}

interface MtmdModelDownloadCardProps {
  title: string
  repo: string
  filename: string
  mmproj: string
  size: string
  onInitialize: (modelPath: string, mmprojPath: string) => void
  onDownloaded?: (modelPath: string, mmprojPath: string) => void
  initializeButtonText?: string
  isLocalFile?: boolean
}

// Create themed styles function
const createStyles = (theme: any) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    flexShrink: 1,
  },
  size: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  sizeColumn: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginTop: 4,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  downloadButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  downloadButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  downloadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  downloadingText: {
    marginLeft: 8,
    fontSize: 16,
    color: theme.colors.primary,
  },
  downloadedContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    flex: 0,
  },
  downloadedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 20,
    color: '#4CAF50',
    marginRight: 8,
  },
  downloadedText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
  initializeButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  initializeButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});

// Common utility functions
const formatSize = (bytes: number): string => {
  if (bytes === 0) {return '0 B';}
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
};

// Base component with shared logic
function BaseModelDownloadCard({
  title,
  size,
  files,
  onInitialize,
  onDownloaded,
  downloadButtonText = 'Download',
  initializeButtonText = 'Initialize',
  isLocalFile = false,
  hideInitializeButton = false,
}: BaseModelDownloadCardProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<{ percentage: number; written: number; total: number } | null>(null);
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [downloadStatus, setDownloadStatus] = useState<string>('');
  const [groupStatus, setGroupStatus] = useState<'queued' | 'running' | 'paused' | 'completed' | 'failed'>('queued');
  const groupId = React.useMemo(() => `${title.replace(/\s+/g, '-').toLowerCase()}-${files.map(f=>f.filename).join(',')}`,[title, files]);
  const subRef = React.useRef<null | (() => void)>(null);
  const pollRef = React.useRef<NodeJS.Timeout | null>(null);
  const [useRowLayout, setUseRowLayout] = useState(true);

  const checkIfDownloaded = React.useCallback(async () => {
    try {
      const dir = ReactNativeBlobUtil.fs.dirs.DocumentDir + '/models';
      const existsStatuses = await Promise.all(
        files.map(async (file) => ReactNativeBlobUtil.fs.exists(`${dir}/${file.filename}`)),
      );
      const allDownloaded = existsStatuses.every(Boolean);
      setIsDownloaded(allDownloaded);

      if (allDownloaded) {
        const paths = files.map((f)=> `${dir}/${f.filename}`);
        setFilePaths(paths);
      }
    } catch (error) {
      console.error('Error checking model status:', error);
    }
  }, [files]);

  useEffect(() => {
    if (isLocalFile) {
      // For local files, mark as downloaded immediately
      setIsDownloaded(true);
      setFilePaths([]); // We'll handle paths differently for local files
    } else {
      checkIfDownloaded();
    }
  }, [checkIfDownloaded, isLocalFile]);

  const handleDownload = async () => {
    if (isDownloading) {return;}

    try {
      setIsDownloading(true);
      setProgress({ written: 0, total: 0, percentage: 0 });

      await BackgroundModelDownloadService.enqueueGroup({
        id: groupId,
        title,
        repo: files[0]!.repo,
        files: files.map(f => ({ filename: f.filename, label: f.label })),
      });
      setGroupStatus(await BackgroundModelDownloadService.status(groupId));
      // Subscribe to progress
      subRef.current && subRef.current();
      subRef.current = BackgroundModelDownloadService.subscribe(groupId, (p) => {
        setProgress({ percentage: p.percentage, written: p.written, total: p.total });
        if (p.percentage >= 100) {
          setGroupStatus('completed');
          checkIfDownloaded();
        }
      });
      // Poll status
      pollRef.current && clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        const s = await BackgroundModelDownloadService.status(groupId);
        setGroupStatus(s);
        if (s === 'completed' || s === 'failed') {
          pollRef.current && clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }, 1000);
    } catch (error: any) {
      Alert.alert(
        'Download Failed',
        error.message || 'Failed to download model(s)',
      );
      setProgress(null);
      setDownloadStatus('');
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    return () => {
      subRef.current && subRef.current();
      if (pollRef.current) { clearInterval(pollRef.current); }
    };
  }, []);

  const onPause = async () => {
    await BackgroundModelDownloadService.pause(groupId);
    setGroupStatus('paused');
  };
  const onResume = async () => {
    await BackgroundModelDownloadService.resume(groupId);
    setGroupStatus('running');
  };
  const onCancel = async () => {
    await BackgroundModelDownloadService.cancel(groupId);
    setGroupStatus('failed');
    setProgress(null);
    setDownloadStatus('');
  };

  const handleInitialize = async () => {
    if (isLocalFile) {
      // For local files, just call onInitialize
      if (onInitialize) {
        onInitialize('');
      } else {
        Alert.alert('Error', 'No initialization handler provided.');
      }
    } else {
      // For downloaded files, check paths
      if (!isDownloaded || filePaths.length !== files.length) {
        Alert.alert('Error', 'Model(s) not downloaded yet.');
        return;
      }

      if (onInitialize) {
        onInitialize(...filePaths);
      } else {
        Alert.alert('Error', 'No initialization handler provided.');
      }
    }
  };

  const handleDelete = async () => {
    const modelText = files.length > 1 ? 'Models' : 'Model';
    Alert.alert(
      `Delete ${modelText}`,
      `Are you sure you want to delete ${title}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const RNBlob = (await import('react-native-blob-util')).default
              const base = RNBlob.fs.dirs.DocumentDir + '/models'
              await Promise.all(
                files.map(async (file) => {
                  const path = `${base}/${file.filename}`
                  if (await RNBlob.fs.exists(path)) {
                    await RNBlob.fs.unlink(path)
                  }
                }),
              )
              setIsDownloaded(false);
              setFilePaths([]);
            } catch (error: any) {
              Alert.alert(
                'Error',
                `Failed to delete ${modelText.toLowerCase()}`,
              );
            }
          },
        },
      ],
    );
  };

  const repoDisplay =
    files.length === 1 && files[0] ? files[0].repo : `${files.length} files`;

  const handleLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    // Switch to column layout if width is less than 300px (adjusted for Android)
    const shouldUseRow = width < 300;
    if (shouldUseRow !== useRowLayout) {
      setUseRowLayout(shouldUseRow);
    }
  };

  return (
    <View style={styles.card} onLayout={handleLayout}>
      <View
        style={[
          styles.header,
          useRowLayout ? styles.headerRow : styles.headerColumn,
        ]}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={useRowLayout ? styles.size : styles.sizeColumn}>
          {size}
        </Text>
      </View>

      <Text style={styles.description}>{repoDisplay}</Text>

      {progress && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress.percentage}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {`${downloadStatus} ${progress.percentage}%`}
          </Text>
          {progress.total > 0 && (
            <Text style={styles.progressText}>
              {`(${formatSize(progress.written)} / ${formatSize(progress.total)})`}
            </Text>
          )}
          {/* Controls */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
            {groupStatus === 'paused' ? (
              <TouchableOpacity onPress={onResume} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.colors.primary, borderRadius: 6, marginHorizontal: 6 }}>
                <Text style={{ color: theme.colors.white }}>Resume</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={onPause} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.colors.primary, borderRadius: 6, marginHorizontal: 6 }}>
                <Text style={{ color: theme.colors.white }}>Pause</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onCancel} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme.colors.error, borderRadius: 6, marginHorizontal: 6 }}>
              <Text style={{ color: theme.colors.white }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.buttonContainer}>
        {!isDownloaded && (
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={handleDownload}
          >
            <Text style={styles.downloadButtonText}>{downloadButtonText}</Text>
          </TouchableOpacity>
        )}

        {isDownloading && (
          <View style={styles.downloadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.downloadingText}>Downloading...</Text>
          </View>
        )}

        {isDownloaded && !isDownloading && (
          <View style={styles.downloadedContainer}>
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
              {!hideInitializeButton && (
                <TouchableOpacity
                  style={styles.initializeButton}
                  onPress={handleInitialize}
                >
                  <Text style={styles.initializeButtonText}>
                    {initializeButtonText}
                  </Text>
                </TouchableOpacity>
              )}
              {hideInitializeButton && (
                <Text style={styles.selectedLabel}>(selected)</Text>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

// Simple single-model download card
function ModelDownloadCard({
  title,
  repo,
  filename,
  size,
  onDownloaded: _onDownloaded,
  onInitialize,
  initializeButtonText,
  isLocalFile = false,
  hideInitializeButton = false,
}: ModelDownloadCardProps) {
  const files: ModelFile[] = [{ repo, filename }];

  return (
    <BaseModelDownloadCard
      title={title}
      size={size}
      files={files}
      onInitialize={onInitialize}
      downloadButtonText="Download"
      initializeButtonText={initializeButtonText}
      isLocalFile={isLocalFile}
      hideInitializeButton={hideInitializeButton}
    />
  );
}

// TTS-specific download card that handles both TTS model and vocoder together
export function TTSModelDownloadCard({
  title,
  repo,
  filename,
  size,
  vocoder,
  onInitialize,
  onDownloaded,
  initializeButtonText,
}: TTSModelDownloadCardProps) {
  const files: ModelFile[] = [
    { repo, filename, label: 'TTS model' },
    { repo: vocoder.repo, filename: vocoder.filename, label: 'vocoder' },
  ];

  return (
    <BaseModelDownloadCard
      title={title}
      size={size}
      files={files}
      onInitialize={onInitialize}
      onDownloaded={onDownloaded}
      downloadButtonText="Download Both Models"
      initializeButtonText={initializeButtonText}
    />
  );
}

// Multimodal-specific download card that handles both model and mmproj files
export function MtmdModelDownloadCard({
  title,
  repo,
  filename,
  mmproj,
  size,
  onInitialize,
  onDownloaded,
  initializeButtonText,
  isLocalFile = false,
}: MtmdModelDownloadCardProps) {
  const files: ModelFile[] = [
    { repo, filename, label: 'Model' },
    { repo, filename: mmproj, label: 'mmproj' },
  ];

  return (
    <BaseModelDownloadCard
      title={title}
      size={size}
      files={files}
      onInitialize={onInitialize}
      onDownloaded={onDownloaded}
      downloadButtonText="Download Model & MMProj"
      initializeButtonText={initializeButtonText}
      isLocalFile={isLocalFile}
    />
  );
}

export default ModelDownloadCard;
