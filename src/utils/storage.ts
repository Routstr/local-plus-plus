import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ContextParams as LlamaContextParams,
  CompletionParams as LlamaCompletionParams,
} from 'llama.rn';

export type ContextParams = Omit<LlamaContextParams, 'model'>
export type CompletionParams = Omit<LlamaCompletionParams, 'prompt'>

export interface TTSParams {
  speakerConfig: any | null
}

export interface CustomModel {
  id: string
  repo: string
  filename: string
  quantization: string
  mmprojFilename?: string
  mmprojQuantization?: string
  addedAt: number
  localPath?: string
  mmprojLocalPath?: string
}

export interface MCPServer {
  name: string
  type: 'streamable-http' | 'sse'
  url: string
  headers?: Record<string, string>
}

export interface MCPConfig {
  mcpServers: Record<string, MCPServer>
}

// Storage keys
const CONTEXT_PARAMS_KEY = '@llama_context_params';
const COMPLETION_PARAMS_KEY = '@llama_completion_params';
const TTS_PARAMS_KEY = '@llama_tts_params';
const CUSTOM_MODELS_KEY = '@llama_custom_models';
const MCP_CONFIG_KEY = '@llama_mcp_config';
const ROUTSTR_TOKEN_KEY = '@routstr_api_token';
const HF_TOKEN_KEY = '@hf_access_token';
const ROUTSTR_FAVORITES_KEY = '@routstr_favorites';
const ROUTSTR_MODELS_CACHE_KEY = '@routstr_models_cache';
const ROUTSTR_BASE_URL_KEY = '@routstr_base_url';
const LAST_SELECTED_MODEL_KEY = '@last_selected_model';

// Default parameter values
export const DEFAULT_CONTEXT_PARAMS: ContextParams = {
  n_ctx: 4096,
  n_gpu_layers: 99,
  use_mlock: true,
  use_mmap: true,
  n_batch: 512,
  n_ubatch: 512,
  ctx_shift: false,
  flash_attn_type: 'auto',
  cache_type_k: 'f16',
  cache_type_v: 'f16',
  kv_unified: false,
  swa_full: false,
};

export const DEFAULT_COMPLETION_PARAMS: CompletionParams = {
  enable_thinking: true,
  n_predict: 1024,
  temperature: 0.7,
  top_p: 0.9,
  stop: [],
};

export const DEFAULT_TTS_PARAMS: TTSParams = {
  speakerConfig: null,
};

export const DEFAULT_MCP_CONFIG: MCPConfig = {
  mcpServers: {},
};

export const DEFAULT_ROUTSTR_BASE_URL = 'https://api.routstr.com';

// Storage functions for context parameters
export const saveContextParams = async (
  params: ContextParams,
): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(params);
    await AsyncStorage.setItem(CONTEXT_PARAMS_KEY, jsonValue);
  } catch (error) {
    console.error('Error saving context params:', error);
    throw error;
  }
};

export const loadContextParams = async (): Promise<ContextParams> => {
  try {
    const jsonValue = await AsyncStorage.getItem(CONTEXT_PARAMS_KEY);
    if (jsonValue != null) {
      const params = JSON.parse(jsonValue);
      // Merge with defaults to ensure all required fields exist
      return { ...DEFAULT_CONTEXT_PARAMS, ...params };
    }
    return DEFAULT_CONTEXT_PARAMS;
  } catch (error) {
    console.error('Error loading context params:', error);
    return DEFAULT_CONTEXT_PARAMS;
  }
};

// Storage functions for completion parameters
export const saveCompletionParams = async (
  params: CompletionParams,
): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(params);
    await AsyncStorage.setItem(COMPLETION_PARAMS_KEY, jsonValue);
  } catch (error) {
    console.error('Error saving completion params:', error);
    throw error;
  }
};

export const loadCompletionParams = async (): Promise<CompletionParams> => {
  try {
    const jsonValue = await AsyncStorage.getItem(COMPLETION_PARAMS_KEY);
    if (jsonValue != null) {
      const params = JSON.parse(jsonValue);
      // Merge with defaults to ensure all required fields exist
      return { ...DEFAULT_COMPLETION_PARAMS, ...params };
    }
    return DEFAULT_COMPLETION_PARAMS;
  } catch (error) {
    console.error('Error loading completion params:', error);
    return DEFAULT_COMPLETION_PARAMS;
  }
};

// Reset functions
export const resetContextParams = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CONTEXT_PARAMS_KEY);
  } catch (error) {
    console.error('Error resetting context params:', error);
    throw error;
  }
};

export const resetCompletionParams = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(COMPLETION_PARAMS_KEY);
  } catch (error) {
    console.error('Error resetting completion params:', error);
    throw error;
  }
};

// Storage functions for TTS parameters
export const saveTTSParams = async (params: TTSParams): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(params);
    await AsyncStorage.setItem(TTS_PARAMS_KEY, jsonValue);
  } catch (error) {
    console.error('Error saving TTS params:', error);
    throw error;
  }
};

export const loadTTSParams = async (): Promise<TTSParams> => {
  try {
    const jsonValue = await AsyncStorage.getItem(TTS_PARAMS_KEY);
    if (jsonValue != null) {
      const params = JSON.parse(jsonValue);
      // Merge with defaults to ensure all required fields exist
      return { ...DEFAULT_TTS_PARAMS, ...params };
    }
    return DEFAULT_TTS_PARAMS;
  } catch (error) {
    console.error('Error loading TTS params:', error);
    return DEFAULT_TTS_PARAMS;
  }
};

export const resetTTSParams = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TTS_PARAMS_KEY);
  } catch (error) {
    console.error('Error resetting TTS params:', error);
    throw error;
  }
};

export const loadCustomModels = async (): Promise<CustomModel[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(CUSTOM_MODELS_KEY);
    if (jsonValue != null) {
      return JSON.parse(jsonValue);
    }
    return [];
  } catch (error) {
    console.error('Error loading custom models:', error);
    return [];
  }
};

// Storage functions for custom models
export const saveCustomModel = async (model: CustomModel): Promise<void> => {
  try {
    const existingModels = await loadCustomModels();
    const updatedModels = [
      ...existingModels.filter((m) => m.id !== model.id),
      model,
    ];
    const jsonValue = JSON.stringify(updatedModels);
    await AsyncStorage.setItem(CUSTOM_MODELS_KEY, jsonValue);
  } catch (error) {
    console.error('Error saving custom model:', error);
    throw error;
  }
};

export const deleteCustomModel = async (modelId: string): Promise<void> => {
  try {
    const existingModels = await loadCustomModels();
    const updatedModels = existingModels.filter((m) => m.id !== modelId);
    const jsonValue = JSON.stringify(updatedModels);
    await AsyncStorage.setItem(CUSTOM_MODELS_KEY, jsonValue);
  } catch (error) {
    console.error('Error deleting custom model:', error);
    throw error;
  }
};

export const getCustomModel = async (
  modelId: string,
): Promise<CustomModel | null> => {
  try {
    const models = await loadCustomModels();
    return models.find((m) => m.id === modelId) || null;
  } catch (error) {
    console.error('Error getting custom model:', error);
    return null;
  }
};

// Storage functions for MCP configuration
export const saveMCPConfig = async (config: MCPConfig): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(config);
    await AsyncStorage.setItem(MCP_CONFIG_KEY, jsonValue);
  } catch (error) {
    console.error('Error saving MCP config:', error);
    throw error;
  }
};

export const loadMCPConfig = async (): Promise<MCPConfig> => {
  try {
    const jsonValue = await AsyncStorage.getItem(MCP_CONFIG_KEY);
    if (jsonValue != null) {
      const config = JSON.parse(jsonValue);
      // Merge with defaults to ensure all required fields exist
      return { ...DEFAULT_MCP_CONFIG, ...config };
    }
    return DEFAULT_MCP_CONFIG;
  } catch (error) {
    console.error('Error loading MCP config:', error);
    return DEFAULT_MCP_CONFIG;
  }
};

export const resetMCPConfig = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(MCP_CONFIG_KEY);
  } catch (error) {
    console.error('Error resetting MCP config:', error);
    throw error;
  }
};

// Routstr token (Cashu token used as API key)
export const saveRoutstrToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(ROUTSTR_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving Routstr token:', error);
    throw error;
  }
};

export const loadRoutstrToken = async (): Promise<string | null> => {
  try {
    return (await AsyncStorage.getItem(ROUTSTR_TOKEN_KEY));
  } catch (error) {
    console.error('Error loading Routstr token:', error);
    return null;
  }
};

export const resetRoutstrToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ROUTSTR_TOKEN_KEY);
  } catch (error) {
    console.error('Error resetting Routstr token:', error);
    throw error;
  }
};

// Hugging Face access token
export const saveHfToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(HF_TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving HF token:', error);
    throw error;
  }
};

export const loadHfToken = async (): Promise<string | null> => {
  try {
    return (await AsyncStorage.getItem(HF_TOKEN_KEY));
  } catch (error) {
    console.error('Error loading HF token:', error);
    return null;
  }
};

export const resetHfToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(HF_TOKEN_KEY);
  } catch (error) {
    console.error('Error resetting HF token:', error);
    throw error;
  }
};

// Routstr base URL
export const saveRoutstrBaseUrl = async (url: string): Promise<void> => {
  try {
    const normalized = (url || '').trim();
    await AsyncStorage.setItem(ROUTSTR_BASE_URL_KEY, normalized);
  } catch (error) {
    console.error('Error saving Routstr base URL:', error);
    throw error;
  }
};

export const loadRoutstrBaseUrl = async (): Promise<string> => {
  try {
    const value = await AsyncStorage.getItem(ROUTSTR_BASE_URL_KEY);
    return value && value.trim().length > 0 ? value.trim() : DEFAULT_ROUTSTR_BASE_URL;
  } catch (error) {
    console.error('Error loading Routstr base URL:', error);
    return DEFAULT_ROUTSTR_BASE_URL;
  }
};

export const resetRoutstrBaseUrl = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ROUTSTR_BASE_URL_KEY);
  } catch (error) {
    console.error('Error resetting Routstr base URL:', error);
    throw error;
  }
};

// Last selected model persistence
export type LastSelectedModelProvider = 'local' | 'routstr'

export interface LastSelectedModel {
  provider: LastSelectedModelProvider
  id: string
  name: string
  filename?: string
  localPath?: string
  apiId?: string
}

export const saveLastSelectedModel = async (model: LastSelectedModel): Promise<void> => {
  try {
    await AsyncStorage.setItem(LAST_SELECTED_MODEL_KEY, JSON.stringify(model));
  } catch (error) {
    console.error('Error saving last selected model:', error);
    throw error;
  }
};

export const loadLastSelectedModel = async (): Promise<LastSelectedModel | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(LAST_SELECTED_MODEL_KEY);
    if (!jsonValue) { return null; }
    return JSON.parse(jsonValue) as LastSelectedModel;
  } catch (error) {
    console.error('Error loading last selected model:', error);
    return null;
  }
};

export const resetLastSelectedModel = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(LAST_SELECTED_MODEL_KEY);
  } catch (error) {
    console.error('Error resetting last selected model:', error);
    throw error;
  }
};

// Routstr favorites
export const loadRoutstrFavorites = async (): Promise<string[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(ROUTSTR_FAVORITES_KEY);
    if (jsonValue != null) {return JSON.parse(jsonValue);}
    return [];
  } catch (error) {
    console.error('Error loading Routstr favorites:', error);
    return [];
  }
};

export const saveRoutstrFavorites = async (ids: string[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(ROUTSTR_FAVORITES_KEY, JSON.stringify(ids));
  } catch (error) {
    console.error('Error saving Routstr favorites:', error);
    throw error;
  }
};

// Routstr models cache (fetched at app startup, refreshable on demand)
export interface RoutstrModelCached {
  id: string
  name: string
  maxCost: number
  completionSatPerToken?: number
}

// In-memory caches (avoid repeated JSON.parse and disk reads)
let IN_MEMORY_ROUTSTR_MODELS_CACHE: RoutstrModelCached[] | null = null;

export const loadRoutstrModelsCache = async (): Promise<RoutstrModelCached[]> => {
  try {
    if (IN_MEMORY_ROUTSTR_MODELS_CACHE) {return IN_MEMORY_ROUTSTR_MODELS_CACHE;}
    const jsonValue = await AsyncStorage.getItem(ROUTSTR_MODELS_CACHE_KEY);
    if (jsonValue != null) {return JSON.parse(jsonValue);}
    return [];
  } catch (error) {
    console.error('Error loading Routstr models cache:', error);
    return [];
  }
};

export const saveRoutstrModelsCache = async (models: RoutstrModelCached[]): Promise<void> => {
  try {
    IN_MEMORY_ROUTSTR_MODELS_CACHE = models;
    await AsyncStorage.setItem(ROUTSTR_MODELS_CACHE_KEY, JSON.stringify(models));
  } catch (error) {
    console.error('Error saving Routstr models cache:', error);
    throw error;
  }
};

// Chat sessions storage
export interface ChatSessionMeta {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

export interface ChatSessionData {
  id: string
  messages: any[]
  systemPrompt?: string
  updatedAt: number
}

const CHAT_SESSIONS_INDEX_KEY = '@chat_sessions_index';
const CHAT_SESSION_KEY_PREFIX = '@chat_session:';
const CHAT_ACTIVE_SESSION_ID_KEY = '@chat_active_session_id';

const generateId = (): string => Math.random().toString(36).slice(2);

export const loadChatSessionsIndex = async (): Promise<ChatSessionMeta[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(CHAT_SESSIONS_INDEX_KEY);
    if (jsonValue) { return JSON.parse(jsonValue); }
    return [];
  } catch (error) {
    console.error('Error loading chat sessions index:', error);
    return [];
  }
};

export const saveChatSessionsIndex = async (sessions: ChatSessionMeta[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(CHAT_SESSIONS_INDEX_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving chat sessions index:', error);
    throw error;
  }
};

export const loadChatSession = async (sessionId: string): Promise<ChatSessionData | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(`${CHAT_SESSION_KEY_PREFIX}${sessionId}`);
    if (!jsonValue) { return null; }
    return JSON.parse(jsonValue);
  } catch (error) {
    console.error('Error loading chat session:', error);
    return null;
  }
};

export const saveChatSession = async (data: ChatSessionData): Promise<void> => {
  try {
    await AsyncStorage.setItem(`${CHAT_SESSION_KEY_PREFIX}${data.id}`, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving chat session:', error);
    throw error;
  }
};

export const deleteChatSession = async (sessionId: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(`${CHAT_SESSION_KEY_PREFIX}${sessionId}`);
    const index = await loadChatSessionsIndex();
    const next = index.filter((s) => s.id !== sessionId);
    await saveChatSessionsIndex(next);
  } catch (error) {
    console.error('Error deleting chat session:', error);
    throw error;
  }
};

export const createChatSession = async (title: string = 'New Chat', systemPrompt?: string): Promise<ChatSessionMeta> => {
  const now = Date.now();
  const id = generateId();
  const meta: ChatSessionMeta = { id, title, createdAt: now, updatedAt: now };
  const data: ChatSessionData = { id, messages: [], systemPrompt, updatedAt: now };
  const index = await loadChatSessionsIndex();
  await Promise.all([
    saveChatSessionsIndex([meta, ...index]),
    saveChatSession(data),
  ]);
  return meta;
};

export const renameChatSession = async (sessionId: string, title: string): Promise<void> => {
  try {
    const index = await loadChatSessionsIndex();
    const next = index.map((s) => (s.id === sessionId ? { ...s, title } : s));
    await saveChatSessionsIndex(next);
  } catch (error) {
    console.error('Error renaming chat session:', error);
    throw error;
  }
};

export const setActiveChatSessionId = async (sessionId: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(CHAT_ACTIVE_SESSION_ID_KEY, sessionId);
  } catch (error) {
    console.error('Error saving active chat session id:', error);
    throw error;
  }
};

export const loadActiveChatSessionId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(CHAT_ACTIVE_SESSION_ID_KEY);
  } catch (error) {
    console.error('Error loading active chat session id:', error);
    return null;
  }
};

export const upsertChatSessionFromMessages = async (
  sessionId: string,
  messages: any[],
  systemPrompt?: string,
): Promise<void> => {
  const now = Date.now();
  const existing = await loadChatSession(sessionId);
  const data: ChatSessionData = {
    id: sessionId,
    messages,
    systemPrompt: systemPrompt ?? existing?.systemPrompt,
    updatedAt: now,
  };
  await saveChatSession(data);
  const index = await loadChatSessionsIndex();
  const titleSource = (() => {
    const firstUser = [...messages].reverse().find((m: any) => m?.type === 'text' && m?.author?.id === 'user');
    const text: string = firstUser?.text || 'New Chat';
    return text.length > 48 ? `${text.slice(0, 48)}…` : text;
  })();
  const updatedMeta: ChatSessionMeta | null = index.find((s) => s.id === sessionId)
    ? null
    : { id: sessionId, title: titleSource, createdAt: now, updatedAt: now };
  const next = index
    .map((s) => (s.id === sessionId ? { ...s, title: titleSource, updatedAt: now } : s));
  await saveChatSessionsIndex(updatedMeta ? [updatedMeta, ...next] : next);
};

