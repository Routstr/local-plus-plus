/* eslint-disable jsx-a11y/accessible-emoji */
import * as React from 'react'
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native'
import {
  GestureHandlerRootView,
  TouchableOpacity,
} from 'react-native-gesture-handler'
import { enableScreens } from 'react-native-screens'
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { toggleNativeLog, addNativeLogListener, BuildInfo } from 'llama.rn'
import SimpleChatScreen from './screens/SimpleChatScreen'
// import MultimodalScreen from './screens/MultimodalScreen'
// import TTSScreen from './screens/TTSScreen'
// import ToolCallsScreen from './screens/ToolCallsScreen'
// import ModelInfoScreen from './screens/ModelInfoScreen'
// import BenchScreen from './screens/BenchScreen'
// import TextCompletionScreen from './screens/TextCompletionScreen'
// import EmbeddingScreen from './screens/EmbeddingScreen'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { createThemedStyles } from './styles/commonStyles'
// import { Menu } from './components/Menu'

// Example: Catch logs from llama.cpp
toggleNativeLog(true)
addNativeLogListener((level, text) => {
  // eslint-disable-next-line prefer-const
  let log = (t: string) => t // noop
  // Uncomment to test:
  // ;({log} = console)
  log(['[localplusplus]', level ? `[${level}]` : '', text].filter(Boolean).join(' '))
})

enableScreens()

// function HomeScreenComponent({ navigation }: { navigation: any }) {
//   const { theme } = useTheme()
//   const themedStyles = createThemedStyles(theme.colors)
//   const styles = StyleSheet.create({
//     container: themedStyles.centerContainer,
//     scrollContainer: { flexGrow: 1, justifyContent: 'center', paddingVertical: 20 },
//     button: { margin: 10, padding: 10, backgroundColor: '#333', borderRadius: 5 },
//     buttonText: { color: theme.colors.white, fontSize: 16, fontWeight: '600', textAlign: 'center' },
//     title: { fontSize: 28, fontWeight: 'bold', color: theme.colors.text, marginBottom: 10, textAlign: 'center' },
//     description: { fontSize: 16, color: theme.colors.textSecondary, textAlign: 'center', paddingHorizontal: 32, lineHeight: 22, marginTop: 4 },
//     repoLink: { marginTop: 8, marginBottom: 24, paddingHorizontal: 32, alignItems: 'center' },
//     repoLinkText: { fontSize: 16, color: theme.colors.primary, textAlign: 'center' },
//   })
//   const openRepo = () => { Linking.openURL('https://github.com/mybigday/llama.rn/tree/main/example') }
//   const openLlamaCppRepo = () => { Linking.openURL(`https://github.com/ggml-org/llama.cpp/releases/b${BuildInfo.number}`) }
//   return null
// }

const Stack = createNativeStackNavigator()

function AppContent() {
  const { theme } = useTheme()
  const navigationTheme = theme.dark ? DarkTheme : DefaultTheme
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator
          initialRouteName="SimpleChat"
          screenOptions={{
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTitleStyle: { color: theme.colors.text },
            headerTintColor: theme.colors.primary,
          }}
        >
          <Stack.Screen
            name="SimpleChat"
            component={SimpleChatScreen}
            options={{ title: 'Chat' }}
          />
          {/**
           * The following screens are intentionally commented out to keep the app minimal.
           * Restore as needed.
           */}
          {/**
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="TextCompletion" component={TextCompletionScreen} />
          <Stack.Screen name="Multimodal" component={MultimodalScreen} />
          <Stack.Screen name="ToolCalling" component={ToolCallsScreen} />
          <Stack.Screen name="Embeddings" component={EmbeddingScreen} />
          <Stack.Screen name="TTS" component={TTSScreen} />
          <Stack.Screen name="ModelInfo" component={ModelInfoScreen} />
          <Stack.Screen name="Bench" component={BenchScreen} />
          */}
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App
