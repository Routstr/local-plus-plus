import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from 'react';
import {
  View,
  Text,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chat } from '@flyerhq/react-native-chat-ui';
import { useFocusEffect, DrawerActions } from '@react-navigation/native';
import type { MessageType } from '@flyerhq/react-native-chat-ui';
import ModelDropdown from '../components/ModelDropdown';
import type { UnifiedModelItemProps } from '../components/UnifiedModelItem';
import { Bubble } from '../components/Bubble';
import { MaskedProgress } from '../components/MaskedProgress';
import { HeaderButton } from '../components/HeaderButton';
import { StopButton } from '../components/StopButton';
import { ModelDownloader } from '../services/ModelDownloader';
import { createThemedStyles, chatDarkTheme, chatLightTheme } from '../styles/commonStyles';
import { useTheme } from '../contexts/ThemeContext';
import { MODELS } from '../utils/constants';
import type { ContextParams } from '../utils/storage';
import {
  DEFAULT_SYSTEM_PROMPT,
  WELCOME_MESSAGE,
  createChatSession,
  loadChatMessages,
  saveChatMessages,
  loadCurrentChatId,
  saveCurrentChatId,
  renameChatSession,
  updateSessionMeta,
  loadChatSessionsIndex,
  type SessionMeta,
  loadContextParams,
  loadRoutstrFavorites,
  loadRoutstrModelsCache,
  loadCustomModels,
} from '../utils/storage';
import type { LLMMessage } from '../utils/llmMessages';
import type { LLMProvider } from '../services/llm/LLMProvider';
import { LocalLLMProvider } from '../services/llm/LocalLLMProvider';
import { RoutstrProvider } from '../services/llm/RoutstrProvider';
import { loadRoutstrToken, saveRoutstrToken } from '../utils/storage';
import { loadRoutstrBaseUrl } from '../utils/storage';
import { fetchRoutstrWalletInfo } from '../services/RoutstrWalletService';
import ContextParamsModal from '../components/ContextParamsModal';

type Provider = 'local' | 'routstr'

const ROUTSTR_MODELS = [
  { label: 'Qwen3 Max', id: 'qwen/qwen3-max' },
  { label: 'GPT-5', id: 'openai/gpt-5' },
  { label: 'Claude 4 Sonnet', id: 'anthropic/claude-4-sonnet' },
];

const user = { id: 'user' };
const assistant = { id: 'assistant' };

const randId = () => Math.random().toString(36).substr(2, 9);

export default function SimpleChatScreen({ navigation, route }: { navigation: any, route: any }) {
  const { isDark, theme } = useTheme();
  const themedStyles = createThemedStyles(theme.colors);

  const messagesRef = useRef<MessageType.Any[]>([]);
  const [, setMessagesVersion] = useState(0); // For UI updates
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const activeSessionMetaRef = useRef<SessionMeta | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isInitLoading, setIsInitLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [llm, setLlm] = useState<LLMProvider | null>(null);
  const [isModelReady, setIsModelReady] = useState(false);
  const [initProgress, setInitProgress] = useState(0);
  const [selectedModelName, setSelectedModelName] = useState<string>('Select a model');
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>();
  const [selectedModelPath, setSelectedModelPath] = useState<string | null>(null);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [provider, setProvider] = useState<Provider>('local');
  const [contextParams, setContextParams] = useState<ContextParams | null>(null);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const insets = useSafeAreaInsets();
  const [routstrToken, setRoutstrToken] = useState<string | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [downloadedLocalModels, setDownloadedLocalModels] = useState<UnifiedModelItemProps[]>([]);
  const [routstrFavoriteIds, setRoutstrFavoriteIds] = useState<string[]>([]);
  const [routstrCachedModels, setRoutstrCachedModels] = useState<{ id: string; name: string; completionSatPerToken?: number }[]>([]);
  const [balanceMsats, setBalanceMsats] = useState<number | null>(null);
  const [displayedBalanceMsats, setDisplayedBalanceMsats] = useState<number | null>(null);
  const balanceAnimFrameRef = useRef<number | null>(null);
  const [showContextParamsModal, setShowContextParamsModal] = useState(false);

  useEffect(() => {
    const loadToken = async () => {
      const token = await loadRoutstrToken();
      setRoutstrToken(token);
    };
    loadToken();
  }, []);



  useEffect(() => () => { llm?.release(); }, [llm]);

  const animateBalance = useCallback((from: number, to: number) => {
    if (balanceAnimFrameRef.current) {cancelAnimationFrame(balanceAnimFrameRef.current);}
    const start = Date.now();
    const duration = 600;
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(from + (to - from) * eased);
      setDisplayedBalanceMsats(current);
      if (t < 1) {balanceAnimFrameRef.current = requestAnimationFrame(step);}
    };
    balanceAnimFrameRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => () => { if (balanceAnimFrameRef.current) {cancelAnimationFrame(balanceAnimFrameRef.current);} }, []);

  const refreshBalance = useCallback(async (animate: boolean = true, explicitToken?: string) => {
    try {
      const info = await fetchRoutstrWalletInfo(explicitToken);
      const next = Math.max(0, Math.round(Number(info.balance) || 0));
      setBalanceMsats(next);
      if (displayedBalanceMsats == null) {
        setDisplayedBalanceMsats(next);
      } else if (animate) {
        animateBalance(displayedBalanceMsats, next);
      } else {
        setDisplayedBalanceMsats(next);
      }
    } catch {
      // ignore balance fetch errors
    }
  }, [animateBalance, displayedBalanceMsats]);

  // Reload Routstr token and base URL on focus and reinitialize provider if needed
  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      const syncToken = async () => {
        const next = await loadRoutstrToken();
        await loadRoutstrBaseUrl();
        if (cancelled) { return; }
        setRoutstrToken(next);
        if (next) { void refreshBalance(false, next); }
        if (next && provider === 'routstr' && llm?.kind === 'routstr' && selectedModelId) {
          try {
            await llm.initialize({ apiKey: next, model: selectedModelId });
          } catch {
            // ignore re-init errors
          }
        }
      };
      void syncToken();
      return () => { cancelled = true; };
    }, [provider, llm, selectedModelId, refreshBalance])
  );

  // Refresh favorites when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      const loadFavs = async () => {
        const ids = await loadRoutstrFavorites();
        if (!cancelled) {setRoutstrFavoriteIds(ids);}
        const cached = await loadRoutstrModelsCache();
        if (!cancelled) {setRoutstrCachedModels(cached.map((m) => ({ id: m.id, name: m.name, completionSatPerToken: m.completionSatPerToken })));}
      };
      loadFavs();
      return () => { cancelled = true; };
    }, []),
  );

  // Track available local models for dropdown (downloaded defaults)
  useEffect(() => {
    let cancelled = false;
    const checkDownloads = async () => {
      const keys: (keyof typeof MODELS)[] = ['SMOL_LM_3', 'GEMMA_3_4B_QAT', 'QWEN_3_4B'];
      const entries = await Promise.all(keys.map(async (k) => {
        const info = MODELS[k];
        const isDownloaded = await ModelDownloader.isModelDownloaded(info.filename);
        return isDownloaded ? ({
          id: k,
          name: info.name,
          type: 'local' as const,
          repo: info.repo,
          filename: info.filename,
          size: info.size,
          onSelect: () => {},
        } as UnifiedModelItemProps) : null;
      }));
      const defaults = entries.filter((e): e is UnifiedModelItemProps => !!e);

      // Load custom models and include those available via localPath or downloaded filename
      const custom = await loadCustomModels();
      const customEntries = await Promise.all(custom.map(async (m) => {
        const hasLocal = !!m.localPath;
        const isDownloaded = m.filename ? await ModelDownloader.isModelDownloaded(m.filename) : false;
        if (!(hasLocal || isDownloaded)) { return null; }
        return ({
          id: `custom:${m.id}`,
          name: m.id,
          type: 'local' as const,
          repo: hasLocal ? 'Local' : m.repo,
          filename: m.filename,
          size: '',
          mmproj: m.mmprojFilename,
          localPath: m.localPath || undefined,
          mmprojLocalPath: m.mmprojLocalPath || undefined,
          onSelect: () => {},
        } as UnifiedModelItemProps);
      }));
      const customs = customEntries.filter((e): e is UnifiedModelItemProps => !!e);
      if (!cancelled) {setDownloadedLocalModels([...defaults, ...customs]);}
    };
    checkDownloads();
    const interval = setInterval(checkDownloads, 2000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const handleSaveContextParams = (params: ContextParams) => {
    setContextParams(params);
  };

  const scheduleSaveMessages = useCallback(() => {
    const id = activeChatId;
    if (!id) { return; }
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); }
    saveTimerRef.current = setTimeout(() => { void saveChatMessages(id, messagesRef.current); }, 300);
  }, [activeChatId]);

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      const loadSession = async () => {
        try {
          const routeId: string | undefined = route?.params?.chatId;
          let id = routeId || (await loadCurrentChatId());
          let index = await loadChatSessionsIndex();
          if (!id || !index.find((s) => s.id === id)) {
            const created = await createChatSession();
            id = created.id;
            index = [created, ...index];
          }
          await saveCurrentChatId(id);
          if (cancelled) { return; }
          setActiveChatId(id);
          const meta = index.find((s) => s.id === id) || null;
          activeSessionMetaRef.current = meta;
          if (meta?.systemPrompt) { setSystemPrompt(meta.systemPrompt); }
          if (meta?.provider) { setProvider(meta.provider as Provider); }
          if (meta?.modelId) { setSelectedModelId(meta.modelId || undefined); }

          const msgs = await loadChatMessages(id);
          if (cancelled) { return; }
          messagesRef.current = Array.isArray(msgs) ? msgs : [];
          setMessagesVersion((v) => v + 1);
        } catch {
          // ignore load errors
        }
      };
      void loadSession();
      return () => { cancelled = true; };
    }, [route?.params?.chatId])
  );

  const reinitializeLocalWithParams = async (params: ContextParams) => {
    if (provider !== 'local') { return; }
    try { await llm?.release(); } catch {}
    if (selectedModelPath) {
      messagesRef.current = [];
      setMessagesVersion((prev) => prev + 1);
      await initializeLocalModel(selectedModelPath, params);
      return;
    }
    if (!selectedModelId) { return; }
    const info = MODELS[selectedModelId as keyof typeof MODELS];
    const filename = info?.filename;
    if (!filename) { return; }
    const isDownloaded = await ModelDownloader.isModelDownloaded(filename);
    if (!isDownloaded) {
      Alert.alert('Model Not Downloaded', `Please download ${selectedModelName} first from one of the other screens.`, [{ text: 'OK' }]);
      return;
    }
    const modelPath = await ModelDownloader.getModelPath(filename);
    if (!modelPath) { return; }
    messagesRef.current = [];
    setMessagesVersion((prev) => prev + 1);
    await initializeLocalModel(modelPath, params);
  };

  const buildLLMMessages = (): LLMMessage[] => {
    const conversationMessages: LLMMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ];

    // Add previous messages from chat history
    const recentMessages = messagesRef.current
      .filter(
        (msg): msg is MessageType.Text =>
          msg.type === 'text' && !msg.metadata?.system,
      )
      .reverse() // Reverse to get chronological order
      .slice(-10) // Keep last 10 messages for context
      .map((msg) => ({
        role:
          msg.author.id === user.id
            ? ('user' as const)
            : ('assistant' as const),
        content: msg.text,
        reasoning_content: msg.metadata?.completionResult?.reasoning_content,
      }));

    return [...conversationMessages, ...recentMessages];
  };

  const addMessage = useCallback((message: MessageType.Any) => {
    messagesRef.current = [message, ...messagesRef.current];
    setMessagesVersion((prev) => prev + 1);
    scheduleSaveMessages();
  }, [scheduleSaveMessages]);

  const updateMessage = (
    messageId: string,
    updateFn: (msg: MessageType.Any) => MessageType.Any,
  ) => {
    const index = messagesRef.current.findIndex((msg) => msg.id === messageId);
    if (index >= 0) {
      messagesRef.current = messagesRef.current.map((msg, i) => {
        if (i === index) {
          return updateFn(msg);
        }
        return msg;
      });
      setMessagesVersion((prev) => prev + 1);
      scheduleSaveMessages();
    }
  };

  const addSystemMessage = useCallback(
    (text: string, metadata = {}) => {
      const textMessage: MessageType.Text = {
        author: assistant,
        createdAt: Date.now(),
        id: randId(),
        text,
        type: 'text',
        metadata: { system: true, ...metadata },
      };
      addMessage(textMessage);
      return textMessage.id;
    },
    [addMessage],
  );

  const handleReset = useCallback(() => {
    Alert.alert(
      'Reset Chat',
      'Are you sure you want to clear all messages? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            messagesRef.current = [];
            setMessagesVersion((prev) => prev + 1);
            addSystemMessage(WELCOME_MESSAGE);
            scheduleSaveMessages();
          },
        },
      ],
    );
  }, [addSystemMessage, scheduleSaveMessages]);

  const initializeLocalModel = async (modelPath: string, overrideParams?: ContextParams) => {
    try {
      setIsInitLoading(true);
      setInitProgress(0);

      const params = overrideParams || contextParams || (await loadContextParams());
      const provider = new LocalLLMProvider(modelPath.split('/').pop() || 'Local Model');
      await provider.initialize({ model: modelPath, params, onProgress: (p) => setInitProgress(p) });
      setLlm(provider);
      setIsModelReady(true);
      setInitProgress(100);
      setSelectedModelPath(modelPath);

      // Add welcome message only if no messages exist
      if (messagesRef.current.length === 0) {
        addSystemMessage(WELCOME_MESSAGE);
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to initialize model: ${error.message}`);
    } finally {
      setIsInitLoading(false);
      setInitProgress(0);
    }
  };

  const initializeRoutstrModel = async (model: UnifiedModelItemProps) => {
    if (!routstrToken) {
      setTokenInput('');
      setShowTokenModal(true);
      return;
    }

    try {
      const provider = new RoutstrProvider(model.name);
      await provider.initialize({ apiKey: routstrToken, model: model.apiId || model.id });
      setLlm(provider);
      setSelectedModelName(model.name);
      setSelectedModelId(model.id);
      setProvider('routstr');
      if (activeChatId) {
        await updateSessionMeta(activeChatId, { provider: 'routstr', modelId: model.id });
      }
      setIsModelReady(true);

      if (messagesRef.current.length === 0) {
        addSystemMessage(WELCOME_MESSAGE);
      }
      // Update balance when starting a Routstr session
      void refreshBalance(false);
    } catch (error: any) {
      Alert.alert('Error', `Failed to initialize Routstr model: ${error.message}`);
    }
  };

  const handleSelectModel = async (model: UnifiedModelItemProps) => {
    await llm?.release();

    if (model.type === 'routstr') {
      await initializeRoutstrModel(model);
    } else {
      // Local model
      setProvider('local');
      setSelectedModelName(model.name);
      setSelectedModelId(model.id);
      if (activeChatId) {
        await updateSessionMeta(activeChatId, { provider: 'local', modelId: model.id });
      }

      // Initialize from provided local path if available, else check downloaded by filename
      const anyModel = model as any;
      if (anyModel.localPath) {
        await initializeLocalModel(anyModel.localPath as string);
      } else if (model.filename) {
        const isDownloaded = await ModelDownloader.isModelDownloaded(model.filename);
        if (isDownloaded) {
          const modelPath = await ModelDownloader.getModelPath(model.filename);
          if (modelPath) {
            await initializeLocalModel(modelPath);
          }
        } else {
          Alert.alert('Model Not Downloaded', `Please download ${model.name} first from one of the other screens.`, [{ text: 'OK' }]);
        }
      }
    }
  };

  // Build model groups for dropdown (only show downloaded local models)
  const modelGroups = [
    { title: 'Local Models', models: downloadedLocalModels },
    {
      title: 'Routstr Models',
      models:
        routstrFavoriteIds.length > 0
          ? routstrFavoriteIds.map((id) => ({
              id,
              name: routstrCachedModels.find((m) => m.id === id)?.name || id,
              type: 'routstr' as const,
              apiId: id,
              completionSatPerToken: routstrCachedModels.find((m) => m.id === id)?.completionSatPerToken,
              onSelect: () => {},
            } as UnifiedModelItemProps))
          : (routstrCachedModels.length > 0
              ? routstrCachedModels.map((m) => ({
                  id: m.id,
                  name: m.name,
                  type: 'routstr' as const,
                  apiId: m.id,
                  completionSatPerToken: m.completionSatPerToken,
                  onSelect: () => {},
                } as UnifiedModelItemProps))
              : ROUTSTR_MODELS.map((m) => ({
                  id: m.id,
                  name: m.label,
                  type: 'routstr' as const,
                  apiId: m.id,
                  onSelect: () => {},
                } as UnifiedModelItemProps))),
    },
  ];

  useLayoutEffect(() => {
    const headerName = (() => {
      const name = selectedModelName || '';
      // Prefer the portion after ':' if present, else use last path segment
      const afterColon = name.includes(':') ? name.split(':')[1]?.trim() || name : name;
      const base = afterColon.includes('/') ? afterColon.split('/').pop() || afterColon : afterColon;
      return base.length > 16 ? `${base.slice(0, 16)}…` : base;
    })();
    navigation.setOptions({
      headerTitleAlign: 'center',
      headerTitle: () => (
        <TouchableOpacity
          onPressIn={() => setShowModelDropdown(true)}
          onPress={() => navigation.setParams({ openModelDropdown: Date.now() })}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: theme.colors.text,
              maxWidth: 220,
            }}
          >
            {headerName || 'Select a model'}
          </Text>
          <Text style={{ marginLeft: 6, fontSize: 16, color: theme.colors.textSecondary }}>
            ▼
          </Text>
        </TouchableOpacity>
      ),
      headerLeft: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <HeaderButton iconName="menu" onPress={() => navigation.dispatch(DrawerActions.openDrawer())} />
          {isModelReady ? <HeaderButton iconName="refresh" onPress={handleReset} /> : null}
        </View>
      ),
      headerRight: () => (
        provider === 'routstr' && routstrToken ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ marginRight: 8, fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary }}>
              {displayedBalanceMsats != null ? `${displayedBalanceMsats.toLocaleString()} msats` : '—'}
            </Text>
          </View>
        ) : provider === 'local' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <HeaderButton iconName="cog-outline" onPress={() => setShowContextParamsModal(true)} />
          </View>
        ) : null
      ),
    });
  }, [navigation, isModelReady, selectedModelName, theme, handleReset, routstrToken, displayedBalanceMsats, provider]);

  // Respond to header request via route params
  useEffect(() => {
    const flag = route?.params?.openModelDropdown;
    if (flag) {
      setShowModelDropdown(true);
      // Clear the flag so it can be triggered again
      navigation.setParams({ openModelDropdown: undefined });
    }
  }, [route?.params?.openModelDropdown, navigation]);

  const handleSendPress = async (message: MessageType.PartialText) => {
    if (isGenerating) {return;}

    const hadPriorUserBefore = messagesRef.current.some((m) => m.type === 'text' && (m as MessageType.Text).author.id === user.id);
    const userMessage: MessageType.Text = {
      author: user,
      createdAt: Date.now(),
      id: randId(),
      text: message.text,
      type: 'text',
    };

    addMessage(userMessage);
    // Auto-title for new chats on first message
    const firstUserMessage = (message.text || '').trim();
    if (activeChatId && firstUserMessage.length > 0) {
      const metaTitle = activeSessionMetaRef.current?.title || 'New chat';
      if (metaTitle === 'New chat' && !hadPriorUserBefore) {
        const newTitle = firstUserMessage
          .replace(/[\n\r]+/g, ' ')
          .replace(/\s+/g, ' ')
          .replace(/[.,!?;:'"()\[\]{}\\/<>@#$%^&*_+=~`|–—…-]+/g, '')
          .trim()
          .slice(0, 40) || 'New chat';
        try {
          await renameChatSession(activeChatId, newTitle);
          activeSessionMetaRef.current = { ...(activeSessionMetaRef.current as SessionMeta), title: newTitle } as SessionMeta;
        } catch {}
      }
    }
    setIsGenerating(true);

    try {
      const conversationMessages = buildLLMMessages();

      const responseId = randId();
      const responseMessage: MessageType.Text = {
        author: assistant,
        createdAt: Date.now(),
        id: responseId,
        text: '',
        type: 'text',
      };

      addMessage(responseMessage);

      if (llm) {
        const { content, metadata } = await llm.sendChat(conversationMessages, (delta) => {
          updateMessage(responseId, (msg) => {
            if (msg.type !== 'text') { return msg; }
            const nextMeta: any = { ...msg.metadata };
            const partial: any = { ...(nextMeta.partialCompletionResult || {}) };
            if (typeof delta.reasoning_content === 'string') { partial.reasoning_content = delta.reasoning_content; }
            if (Array.isArray(delta.tool_calls)) { partial.tool_calls = delta.tool_calls; }
            if (typeof delta.content === 'string') { partial.content = delta.content.replace(/^\s+/, ''); }
            nextMeta.partialCompletionResult = partial;
            return { ...msg, text: typeof delta.content === 'string' ? delta.content.replace(/^\s+/, '') : msg.text, metadata: nextMeta };
          });
        });
        updateMessage(responseId, (msg) => ({
          ...msg,
          text: content,
          metadata: { ...msg.metadata, ...metadata },
        }));
      } else {
        throw new Error('No LLM provider selected');
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to generate response: ${error.message}`);
    } finally {
      setIsGenerating(false);
      if (routstrToken) {void refreshBalance(true);}
      // Save at boundary
      scheduleSaveMessages();
    }
  };

  const renderBubble = ({
    child,
    message,
  }: {
    child: React.ReactNode
    message: MessageType.Any
  }) => <Bubble child={child} message={message} />;

  return (
    <View style={themedStyles.container}>
      <Chat
        renderBubble={renderBubble}
        emptyState={() => <View />}
        theme={isDark ? chatDarkTheme : chatLightTheme}
        messages={messagesRef.current}
        onSendPress={handleSendPress}
        user={user}
        textInputProps={{
          editable: !isGenerating && isModelReady,
          placeholder: isGenerating
            ? 'AI is thinking...'
            : isModelReady ? 'Type your message here' : 'Select a model to start',
          keyboardType: 'ascii-capable',
        }}
      />

      {llm?.kind === 'local' && (
        <StopButton context={llm.getContext()} insets={insets} isLoading={isGenerating} />
      )}

      <ModelDropdown
        visible={showModelDropdown}
        onClose={() => setShowModelDropdown(false)}
        selectedModelId={selectedModelId}
        onSelectModel={handleSelectModel}
        modelGroups={modelGroups}
        currentModelName={selectedModelName}
        onOpenSettings={() => navigation.navigate('ModelManager')}
      />

      <MaskedProgress
        visible={isInitLoading}
        text={`Initializing model... ${initProgress}%`}
        progress={initProgress}
        showProgressBar={initProgress > 0}
      />

      {/* Routstr Token Modal */}
      <Modal visible={showTokenModal} transparent animationType="fade" onRequestClose={() => setShowTokenModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <View style={{ width: '100%', backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.colors.border }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: 8 }}>Enter Cashu Token</Text>
            <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginBottom: 12 }}>Paste your Routstr Cashu token. It will be stored locally and used as the API key.</Text>
            <TextInput
              value={tokenInput}
              onChangeText={setTokenInput}
              placeholder="cashu..."
              placeholderTextColor={theme.colors.textSecondary}
              style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.text, height: 44 }}
              autoCapitalize="none"
              autoCorrect={false}
              numberOfLines={1}
              multiline={false}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
              <TouchableOpacity onPress={() => setShowTokenModal(false)} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: theme.colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  if (!tokenInput.trim()) {return;}
                  await saveRoutstrToken(tokenInput.trim());
                  setRoutstrToken(tokenInput.trim());
                  setShowTokenModal(false);
                  // Fetch wallet balance immediately on token save
                  await refreshBalance(false, tokenInput.trim());
                  // Retry model initialization
                  const selectedModel = modelGroups
                    .flatMap((g) => g.models)
                    .find((m) => m.id === selectedModelId);
                  if (selectedModel && selectedModel.type === 'routstr') {
                    await initializeRoutstrModel(selectedModel);
                  }
                }}
                style={{ paddingHorizontal: 12, paddingVertical: 8 }}
              >
                <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <ContextParamsModal
        visible={showContextParamsModal}
        onClose={() => setShowContextParamsModal(false)}
        onSave={async (params) => {
          handleSaveContextParams(params);
          await reinitializeLocalWithParams(params);
          setShowContextParamsModal(false);
        }}
      />
    </View>
  );
}
