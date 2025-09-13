import { initLlama, LlamaContext } from 'llama.rn';
import type { LLMMessage } from '../../utils/llmMessages';
import type { LLMProvider, LLMProviderKind, SendResult } from './LLMProvider';

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
    this.context = await initLlama({ model, ...params }, (p) => onProgress?.(p));
  }

  async sendChat(messages: LLMMessage[], onDelta: (content: string) => void): Promise<SendResult> {
    if (!this.context) {throw new Error('Model not initialized');}
    const completionResult = await this.context.completion(
      {
        messages,
        reasoning_format: 'auto',
        jinja: true,
      },
      (data) => {
        const { content = '' } = data;
        if (content) {onDelta(content.replace(/^\s+/, ''));}
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
      await this.context.release();
      this.context = null;
    }
  }
}


