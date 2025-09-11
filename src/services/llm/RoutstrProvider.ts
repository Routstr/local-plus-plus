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
  private currentXhr: XMLHttpRequest | null = null

  constructor(name: string) {
    this.name = name
  }

  getContext(): LlamaContext | null { return null }

  async initialize(args: InitArgs): Promise<void> {
    this.apiKey = args.apiKey
    this.model = args.model
  }

  async sendChat(messages: LLMMessage[], onDelta: (content: string) => void): Promise<SendResult> {
    const url = 'https://api.routstr.com/v1/chat/completions'
    const body = JSON.stringify({
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: 0.7,
      stream: true,
    })

    return await new Promise<SendResult>((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest()
        this.currentXhr = xhr
        xhr.open('POST', url)
        xhr.setRequestHeader('Content-Type', 'application/json')
        xhr.setRequestHeader('Authorization', `Bearer ${this.apiKey}`)
        xhr.setRequestHeader('Accept', 'text/event-stream')

        let accumulated = ''
        let buffer = ''
        let processedIndex = 0

        const processBuffer = () => {
          let idx: number
          while ((idx = buffer.indexOf('\n')) !== -1) {
            const raw = buffer.slice(0, idx)
            buffer = buffer.slice(idx + 1)
            const line = raw.trim()
            if (!line) continue
            if (line.startsWith(':')) continue // comment
            if (!line.startsWith('data:')) continue
            const payload = line.slice(5).trim()
            if (payload === '[DONE]') {
              // finish will be handled on load/end
              continue
            }
            try {
              const json = JSON.parse(payload)
              const delta = json?.choices?.[0]?.delta?.content ?? ''
              if (delta) {
                accumulated += delta
                onDelta(accumulated)
              }
            } catch {
              // keep buffering until full JSON chunk
            }
          }
        }

        xhr.onprogress = () => {
          try {
            const resp = xhr.responseText || ''
            const chunk = resp.substring(processedIndex)
            if (chunk) {
              processedIndex += chunk.length
              buffer += chunk
              processBuffer()
            }
          } catch (e) {
            // ignore incremental parsing errors
          }
        }

        xhr.onload = () => {
          try {
            // process any remaining buffered data
            processBuffer()
            resolve({ content: accumulated, metadata: { provider: 'routstr', streamed: true } })
          } catch (e) {
            reject(e as Error)
          } finally {
            this.currentXhr = null
          }
        }

        xhr.onerror = () => {
          this.currentXhr = null
          reject(new Error('Network error'))
        }

        xhr.send(body)
      } catch (e) {
        reject(e as Error)
      }
    })
  }

  stop(): void { this.currentXhr?.abort(); this.currentXhr = null }
  release(): void {}
}


