import type { LlamaContext } from 'llama.rn';
import type { LLMMessage } from '../../utils/llmMessages';
import type { LLMProvider, LLMProviderKind, SendResult, StreamDelta } from './LLMProvider';
import { loadRoutstrBaseUrl } from '../../utils/storage';

type InitArgs = {
  apiKey: string
  model: string
}

export class RoutstrProvider implements LLMProvider {
  readonly kind: LLMProviderKind = 'routstr';
  readonly name: string;
  private apiKey: string = '';
  private model: string = '';
  private currentXhr: XMLHttpRequest | null = null;

  constructor(name: string) {
    this.name = name;
  }

  getContext(): LlamaContext | null { return null; }

  async initialize(args: InitArgs): Promise<void> {
    this.apiKey = args.apiKey;
    this.model = args.model;
  }

  async sendChat(messages: LLMMessage[], onDelta: (delta: StreamDelta) => void): Promise<SendResult> {
    const baseUrl = await loadRoutstrBaseUrl();
    const url = `${baseUrl}/v1/chat/completions`;
    const body = JSON.stringify({
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: 0.1,
      stream: true,
      reasoning: { effort: 'medium' },  // TODO: make this configurable
    });

    return await new Promise<SendResult>((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        this.currentXhr = xhr;
        xhr.open('POST', url);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Authorization', `Bearer ${this.apiKey}`);
        xhr.setRequestHeader('Accept', 'text/event-stream');

        let accumulated = '';
        let accumulatedReasoning = '';
        let buffer = '';
        let processedIndex = 0;
        let currentEvent: string | null = null;

        const processBuffer = () => {
          let idx: number;
          while ((idx = buffer.indexOf('\n')) !== -1) {
            const raw = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            const line = raw.trim();
            if (!line) {continue;}
            if (line.startsWith(':')) {continue;} // comment
            if (line.startsWith('event:')) {
              currentEvent = line.slice(6).trim();
              continue;
            }
            if (!line.startsWith('data:')) {continue;}
            const payload = line.slice(5).trim();
            if (payload === '[DONE]') { continue; }
            try {
              const json = JSON.parse(payload);
              const streamDelta: StreamDelta = {};

              // Chat Completions style
              const choice = json?.choices?.[0];
              const d = choice?.delta ?? {};
              const ccContent: string | undefined = d.content;
              const ccReasoning: string | undefined = d.reasoning_content || d.reasoning;
              const ccToolCalls: any[] | undefined = d.tool_calls;

              if (ccContent || ccReasoning || ccToolCalls) {
                if (ccContent) { accumulated += ccContent; streamDelta.content = accumulated; }
                if (ccReasoning) { accumulatedReasoning += ccReasoning; streamDelta.reasoning_content = accumulatedReasoning; }
                if (ccToolCalls) { streamDelta.tool_calls = ccToolCalls; }
              } else {
                // Responses API style via named events
                const ev = (currentEvent || '').toLowerCase();
                if (ev.includes('output_text.delta')) {
                  const piece: string | undefined = json.delta || json.text || json.output_text?.delta;
                  if (piece) { accumulated += piece; streamDelta.content = accumulated; }
                } else if (ev.includes('reasoning.delta')) {
                  const piece: string | undefined = json.delta || json.text || json.reasoning?.delta;
                  if (piece) { accumulatedReasoning += piece; streamDelta.reasoning_content = accumulatedReasoning; }
                } else if (ev.includes('function_call') || ev.includes('tool_call')) {
                  const tool = json?.delta || json?.tool_call || json?.function_call;
                  if (tool) { streamDelta.tool_calls = Array.isArray(tool) ? tool : [tool]; }
                } else {
                  // Generic fallback: try common fields
                  const piece: string | undefined = json.delta || json.text;
                  if (piece) { accumulated += piece; streamDelta.content = accumulated; }
                }
              }

              if (streamDelta.content || streamDelta.reasoning_content || streamDelta.tool_calls) { onDelta(streamDelta); }
            } catch {
              // keep buffering until full JSON chunk
            }
          }
        };

        xhr.onprogress = () => {
          try {
            const resp = xhr.responseText || '';
            const chunk = resp.substring(processedIndex);
            if (chunk) {
              processedIndex += chunk.length;
              buffer += chunk;
              processBuffer();
            }
          } catch (e) {
            // ignore incremental parsing errors
          }
        };

        xhr.onload = () => {
          try {
            // process any remaining buffered data
            processBuffer();
            resolve({ content: accumulated, metadata: { provider: 'routstr', streamed: true, completionResult: { content: accumulated, reasoning_content: accumulatedReasoning } } });
          } catch (e) {
            reject(e as Error);
          } finally {
            this.currentXhr = null;
          }
        };

        xhr.onerror = () => {
          this.currentXhr = null;
          reject(new Error('Network error'));
        };

        xhr.send(body);
      } catch (e) {
        reject(e as Error);
      }
    });
  }

  stop(): void { this.currentXhr?.abort(); this.currentXhr = null; }
  release(): void { this.stop(); }
}


