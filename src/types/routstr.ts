export interface Architecture {
  modality: string
  input_modalities: string[]
  output_modalities: string[]
  tokenizer: string
  instruct_type: string | null
}

export interface Pricing {
  prompt: number
  completion: number
  request: number
  image: number
  web_search: number
  internal_reasoning: number
  max_prompt_cost: number
  max_completion_cost: number
  max_cost: number
}

export interface TopProvider {
  context_length: number | null
  max_completion_tokens: number | null
  is_moderated: boolean | null
}

export interface RoutstrModel {
  id: string
  name: string
  created: number
  description: string
  context_length: number
  architecture: Architecture
  pricing: Pricing
  sats_pricing: Pricing | null
  per_request_limits?: Record<string, unknown> | null
  top_provider?: TopProvider | null
}


