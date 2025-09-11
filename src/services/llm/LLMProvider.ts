import type { LlamaContext } from 'llama.rn'
import type { LLMMessage } from '../../utils/llmMessages'

export type LLMProviderKind = 'local' | 'routstr'

export interface SendResult {
  content: string
  metadata?: Record<string, unknown>
}

export interface LLMProvider {
  readonly kind: LLMProviderKind
  readonly name: string
  initialize(args: Record<string, unknown>): Promise<void>
  sendChat(messages: LLMMessage[], onDelta: (content: string) => void): Promise<SendResult>
  stop(): void
  release(): Promise<void> | void
  getContext(): LlamaContext | null
}


