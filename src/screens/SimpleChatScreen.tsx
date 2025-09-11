import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from 'react'
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Chat } from '@flyerhq/react-native-chat-ui'
import type { MessageType } from '@flyerhq/react-native-chat-ui'
import ModelDownloadCard from '../components/ModelDownloadCard'
// import ContextParamsModal from '../components/ContextParamsModal'
// import CompletionParamsModal from '../components/CompletionParamsModal'
// import CustomModelModal from '../components/CustomModelModal'
// import CustomModelCard from '../components/CustomModelCard'
import { Bubble } from '../components/Bubble'
import { MaskedProgress } from '../components/MaskedProgress'
import { HeaderButton } from '../components/HeaderButton'
// import { Menu } from '../components/Menu'
// import { MessagesModal } from '../components/MessagesModal'
// import SessionModal from '../components/SessionModal'
import { StopButton } from '../components/StopButton'
import { createThemedStyles, chatDarkTheme, chatLightTheme } from '../styles/commonStyles'
import { useTheme } from '../contexts/ThemeContext'
import { MODELS } from '../utils/constants'
import type {
  ContextParams,
  CompletionParams,
  // CustomModel,
} from '../utils/storage'
import {
  loadContextParams,
  loadCompletionParams,
  // loadCustomModels,
} from '../utils/storage'
import type { LLMMessage } from '../utils/llmMessages'
import { initLlama, LlamaContext } from 'llama.rn'
import type { LLMProvider } from '../services/llm/LLMProvider'
import { LocalLLMProvider } from '../services/llm/LocalLLMProvider'
import { RoutstrProvider } from '../services/llm/RoutstrProvider'

type Provider = 'local' | 'routstr'

const ROUTSTR_API_KEY = 'sk-REPLACE_ME'
const ROUTSTR_MODEL_NAME = 'Routstr GPT-4'
const ROUTSTR_CHAT_MODEL = 'gpt-4'

const user = { id: 'user' }
const assistant = { id: 'assistant' }

const randId = () => Math.random().toString(36).substr(2, 9)

const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful, harmless, and honest AI assistant. Be concise and helpful in your responses.'

export default function SimpleChatScreen({ navigation }: { navigation: any }) {
  const { isDark, theme } = useTheme()
  const themedStyles = createThemedStyles(theme.colors)

  const messagesRef = useRef<MessageType.Any[]>([])
  const [, setMessagesVersion] = useState(0) // For UI updates
  const [isInitLoading, setIsInitLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [context, setContext] = useState<LlamaContext | null>(null)
  const [llm, setLlm] = useState<LLMProvider | null>(null)
  const [isModelReady, setIsModelReady] = useState(false)
  const [initProgress, setInitProgress] = useState(0)
  const [selectedModelName, setSelectedModelName] = useState<string>('Select a model')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [provider, setProvider] = useState<Provider>('local')
  const windowWidth = Dimensions.get('window').width
  const drawerWidth = Math.min(360, Math.round(windowWidth * 0.85))
  const drawerAnim = useRef(new Animated.Value(0)).current
  // const [showContextParamsModal, setShowContextParamsModal] = useState(false)
  // const [showCompletionParamsModal, setShowCompletionParamsModal] =
  //   useState(false)
  // const [showMessagesModal, setShowMessagesModal] = useState(false)
  // const [showSessionModal, setShowSessionModal] = useState(false)
  // const [showCustomModelModal, setShowCustomModelModal] = useState(false)
  const [contextParams, setContextParams] = useState<ContextParams | null>(null)
  const [completionParams, setCompletionParams] =
    useState<CompletionParams | null>(null)
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT)
  // const [customModels, setCustomModels] = useState<CustomModel[]>([])
  const insets = useSafeAreaInsets()

  useEffect(
    () => () => {
      if (context) {
        context.release()
      }
    },
    [context],
  )

  // // Load custom models on mount (disabled for minimal app)
  // useEffect(() => {
  //   const loadCustomModelsData = async () => {
  //     try {
  //       const models = await loadCustomModels()
  //       setCustomModels(models)
  //     } catch (error) {
  //       console.error('Error loading custom models:', error)
  //     }
  //   }
  //   loadCustomModelsData()
  // }, [])

  const handleSaveContextParams = (params: ContextParams) => {
    setContextParams(params)
  }

  const handleSaveCompletionParams = (params: CompletionParams) => {
    setCompletionParams(params)
  }

  // const handleCustomModelAdded = async (_model: CustomModel) => {
  //   const models = await loadCustomModels()
  //   setCustomModels(models)
  // }

  // const handleCustomModelRemoved = async () => {
  //   const models = await loadCustomModels()
  //   setCustomModels(models)
  // }

  const buildLLMMessages = (): LLMMessage[] => {
    const conversationMessages: LLMMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ]

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
      }))

    return [...conversationMessages, ...recentMessages]
  }

  const addMessage = useCallback((message: MessageType.Any) => {
    messagesRef.current = [message, ...messagesRef.current]
    setMessagesVersion((prev) => prev + 1)
  }, [])

  const updateMessage = (
    messageId: string,
    updateFn: (msg: MessageType.Any) => MessageType.Any,
  ) => {
    const index = messagesRef.current.findIndex((msg) => msg.id === messageId)
    if (index >= 0) {
      messagesRef.current = messagesRef.current.map((msg, i) => {
        if (i === index) {
          return updateFn(msg)
        }
        return msg
      })
      setMessagesVersion((prev) => prev + 1)
    }
  }

  const addSystemMessage = useCallback(
    (text: string, metadata = {}) => {
      const textMessage: MessageType.Text = {
        author: assistant,
        createdAt: Date.now(),
        id: randId(),
        text,
        type: 'text',
        metadata: { system: true, ...metadata },
      }
      addMessage(textMessage)
      return textMessage.id
    },
    [addMessage],
  )

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
            messagesRef.current = []
            setMessagesVersion((prev) => prev + 1)
            addSystemMessage(
              "Hello! I'm ready to chat with you. How can I help you today?",
            )
          },
        },
      ],
    )
  }, [addSystemMessage])

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <HeaderButton iconName="menu" onPress={() => openDrawer()} />
      ),
      title: isModelReady ? selectedModelName : 'Select a model',
      headerRight: () => (
        isModelReady ? <HeaderButton iconName="refresh" onPress={handleReset} /> : null
      ),
    })
  }, [navigation, isModelReady, selectedModelName, handleReset])

  // const handleImportMessages = (newMessages: MessageType.Any[]) => {
  //   messagesRef.current = []
  //   setMessagesVersion((prev) => prev + 1)
  //   addSystemMessage(
  //     "Hello! I'm ready to chat with you. How can I help you today?",
  //   )
  //   messagesRef.current = [...newMessages.reverse(), ...messagesRef.current]
  //   setMessagesVersion((prev) => prev + 1)
  // }

  // const handleUpdateSystemPrompt = (newSystemPrompt: string) => {
  //   setSystemPrompt(newSystemPrompt)
  // }

  const initializeModel = async (modelPath: string) => {
    try {
      setIsInitLoading(true)
      setInitProgress(0)

      setProvider('local')

      const params = contextParams || (await loadContextParams())
      const llamaContext = await initLlama(
        {
          model: modelPath,
          ...params,
        },
        (progress) => {
          // Progress is reported as 1 to 100
          setInitProgress(progress)
        },
      )

      setContext(llamaContext)
      const provider = new LocalLLMProvider(modelPath.split('/').pop() || 'Local Model')
      await provider.initialize({ model: modelPath, params, onProgress: (p) => setInitProgress(p) })
      setLlm(provider)
      setIsModelReady(true)
      setInitProgress(100)

      // Add welcome message only if no messages exist to avoid duplicates on switch
      if (messagesRef.current.length === 0) {
        addSystemMessage(
          "Hello! I'm ready to chat with you. How can I help you today?",
        )
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to initialize model: ${error.message}`)
    } finally {
      setIsInitLoading(false)
      setInitProgress(0)
    }
  }

  const openDrawer = () => {
    setIsDrawerOpen(true)
    Animated.timing(drawerAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start()
  }

  const closeDrawer = () => {
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setIsDrawerOpen(false)
    })
  }

  const handleSendPress = async (message: MessageType.PartialText) => {
    if (isGenerating) return

    const userMessage: MessageType.Text = {
      author: user,
      createdAt: Date.now(),
      id: randId(),
      text: message.text,
      type: 'text',
    }

    addMessage(userMessage)
    setIsGenerating(true)

    try {
      // Build conversation messages using the reusable function
      const conversationMessages = buildLLMMessages()

      const responseId = randId()
      const responseMessage: MessageType.Text = {
        author: assistant,
        createdAt: Date.now(),
        id: responseId,
        text: '',
        type: 'text',
      }

      addMessage(responseMessage)

      if (llm) {
        const { content, metadata } = await llm.sendChat(conversationMessages, (delta) => {
          updateMessage(responseId, (msg) => {
            if (msg.type === 'text') {
              return { ...msg, text: delta.replace(/^\s+/, '') }
            }
            return msg
          })
        })
        updateMessage(responseId, (msg) => ({
          ...msg,
          text: content,
          metadata: { ...msg.metadata, ...metadata },
        }))
      } else {
        throw new Error('No LLM provider selected')
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to generate response: ${error.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const renderBubble = ({
    child,
    message,
  }: {
    child: React.ReactNode
    message: MessageType.Any
  }) => <Bubble child={child} message={message} />

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
            : isModelReady ? 'Type your message here' : 'Open menu to select a model',
          keyboardType: 'ascii-capable',
        }}
      />

      {llm?.kind === 'local' && (
        <StopButton context={llm.getContext()} insets={insets} isLoading={isGenerating} />
      )}

      {/* Side Drawer Overlay */}
      <Animated.View
        pointerEvents={isDrawerOpen ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          opacity: drawerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
        }}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeDrawer} />
      </Animated.View>

      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: drawerWidth,
          backgroundColor: theme.colors.surface,
          borderRightWidth: 1,
          borderRightColor: theme.colors.border,
          transform: [{
            translateX: drawerAnim.interpolate({ inputRange: [0, 1], outputRange: [-drawerWidth, 0] }),
          }],
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 2, height: 0 },
          shadowOpacity: 0.2,
          shadowRadius: 6,
          elevation: 6,
        }}
      >
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.text }}>Models</Text>
          <Text style={{ fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 }}>Select a model to use</Text>
        </View>
        <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
          {/* <Text style={themedStyles.modelSectionTitle}>Default Models</Text> */}
          {[
            'SMOL_LM_3',
            'GEMMA_3_4B_QAT',
            'QWEN_3_4B',
          ].map((model) => {
            const modelInfo = MODELS[model as keyof typeof MODELS]
            return (
              <ModelDownloadCard
                key={model}
                title={modelInfo.name}
                repo={modelInfo.repo}
                filename={modelInfo.filename}
                size={modelInfo.size}
                initializeButtonText={isModelReady ? 'Switch to this model' : 'Initialize'}
                hideInitializeButton={isModelReady && selectedModelName === modelInfo.name}
                onInitialize={async (path) => {
                  setSelectedModelName(modelInfo.name)
                  await llm?.release()
                  await initializeModel(path)
                  setLlm(new LocalLLMProvider(modelInfo.name))
                  closeDrawer()
                }}
              />
            )
          })}
          <Text style={themedStyles.modelSectionTitle}>Cloud Models</Text>
          <View style={{ backgroundColor: theme.colors.surface, borderRadius: 12, marginHorizontal: 16, marginVertical: 8, padding: 16, borderWidth: 1, borderColor: theme.colors.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.text }}>{ROUTSTR_MODEL_NAME}</Text>
                <Text style={{ fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 }}>Uses Routstr API (no download)</Text>
              </View>
              {selectedModelName === ROUTSTR_MODEL_NAME ? (
                <Text style={{ fontSize: 14, color: theme.colors.textSecondary }}>(selected)</Text>
              ) : (
                <TouchableOpacity
                  style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 }}
                  onPress={async () => {
                    await llm?.release()
                    const provider = new RoutstrProvider(ROUTSTR_MODEL_NAME)
                    await provider.initialize({ apiKey: ROUTSTR_API_KEY, model: ROUTSTR_CHAT_MODEL })
                    setLlm(provider)
                    setSelectedModelName(ROUTSTR_MODEL_NAME)
                    setIsModelReady(true)
                    if (messagesRef.current.length === 0) {
                      addSystemMessage("Hello! I'm ready to chat with you. How can I help you today?")
                    }
                    closeDrawer()
                  }}
                >
                  <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: '600' }}>Use</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={{ height: 24 }} />
        </ScrollView>
      </Animated.View>

      {/** Advanced modals are disabled for minimal app */}
      {/**
      <CompletionParamsModal
        visible={showCompletionParamsModal}
        onClose={() => setShowCompletionParamsModal(false)}
        onSave={handleSaveCompletionParams}
      />
      <MessagesModal
        visible={showMessagesModal}
        onClose={() => setShowMessagesModal(false)}
        messages={buildLLMMessages()}
        context={context}
        onImportMessages={handleImportMessages}
        onUpdateSystemPrompt={handleUpdateSystemPrompt}
        defaultSystemPrompt={DEFAULT_SYSTEM_PROMPT}
      />
      <SessionModal
        visible={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        context={context}
      />
      */}

      <MaskedProgress
        visible={isInitLoading}
        text={`Initializing model... ${initProgress}%`}
        progress={initProgress}
        showProgressBar={initProgress > 0}
      />
    </View>
  )
}
