import type { LlamaContext } from 'llama.rn'
import type { LLMMessage } from '../../utils/llmMessages'
import type { LLMProvider, LLMProviderKind, SendResult } from './LLMProvider'

type InitArgs = {
  apiKey: string
  model: string
}

export class RoutstrProvider implements LLMProvider {
  readonly kind: LLMProviderKind = 'routstr'
  readonly name: string
  private apiKey: string = ''
  private model: string = ''

  constructor(name: string) {
    this.name = name
  }

  getContext(): LlamaContext | null { return null }

  async initialize(args: InitArgs): Promise<void> {
    this.apiKey = args.apiKey
    this.model = args.model
  }

  async sendChat(messages: LLMMessage[], onDelta: (content: string) => void): Promise<SendResult> {
    const response = await fetch('https://api.routstr.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: 0.7,
      }),
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || `HTTP ${response.status}`)
    }
    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content ?? ''
    if (content) onDelta(content)
    return { content, metadata: { provider: 'routstr' } }
  }

  stop(): void {}
  release(): void {}
}


