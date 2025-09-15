import { initLlama, LlamaContext } from 'llama.rn';
import type { LLMMessage } from '../../utils/llmMessages';
import type { LLMProvider, LLMProviderKind, SendResult, StreamDelta } from './LLMProvider';

type InitArgs = {
  model: string
  params: Record<string, unknown>
  onProgress?: (p: number) => void
}

export class LocalLLMProvider implements LLMProvider {
  readonly kind: LLMProviderKind = 'local';
  readonly name: string;
  private context: LlamaContext | null = null;

  constructor(name: string) {
    this.name = name;
  }

  getContext(): LlamaContext | null { return this.context; }

  async initialize(args: InitArgs): Promise<void> {
    const { model, params, onProgress } = args;
    if (this.context) {
      try { await this.context.release(); } catch {}
      this.context = null;
    }
    if (__DEV__) { try { console.log('[LocalLLMProvider] init', model); } catch {} }
    this.context = await initLlama({ model, ...params }, (p) => onProgress?.(p));
  }

  async sendChat(messages: LLMMessage[], onDelta: (delta: StreamDelta) => void): Promise<SendResult> {
    if (!this.context) {throw new Error('Model not initialized');}
    const completionResult = await this.context.completion(
      {
        messages,
        reasoning_format: 'auto',
        jinja: true,
      },
      (data) => {
        const { content = '', reasoning_content, tool_calls } = data as { content?: string; reasoning_content?: string; tool_calls?: any[] };
        const payload: StreamDelta = {};
        if (content) { payload.content = content.replace(/^\s+/, ''); }
        if (reasoning_content) { payload.reasoning_content = reasoning_content; }
        if (tool_calls) { payload.tool_calls = tool_calls; }
        if (payload.content || payload.reasoning_content || payload.tool_calls) { onDelta(payload); }
      },
    );
    const content = completionResult.interrupted ? completionResult.text : completionResult.content;
    return { content, metadata: { completionResult } };
  }

  stop(): void {
    this.context?.stopCompletion();
  }

  async release(): Promise<void> {
    if (this.context) {
      if (__DEV__) { try { console.log('[LocalLLMProvider] release'); } catch {} }
      await this.context.release();
      this.context = null;
    }
  }
}


