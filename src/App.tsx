
import * as React from 'react';
import { InteractionManager } from 'react-native';
import {
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { toggleNativeLog, addNativeLogListener, setContextLimit, releaseAllLlama } from 'llama.rn';
import SimpleChatScreen from './screens/SimpleChatScreen';
import ModelManagerScreen from './screens/ModelManagerScreen';
import RoutstrSettingsScreen from './screens/RoutstrSettingsScreen';
// import MultimodalScreen from './screens/MultimodalScreen'
// import TTSScreen from './screens/TTSScreen'
// import ToolCallsScreen from './screens/ToolCallsScreen'
// import ModelInfoScreen from './screens/ModelInfoScreen'
// import BenchScreen from './screens/BenchScreen'
// import TextCompletionScreen from './screens/TextCompletionScreen'
// import EmbeddingScreen from './screens/EmbeddingScreen'
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import ChatDrawer from './components/ChatDrawer';
import { refreshAndCacheRoutstrModels } from './services/RoutstrModelsService';
// import { Menu } from './components/Menu'

// Example: Catch logs from llama.cpp (dev only to avoid perf overhead)
if (__DEV__) {
  toggleNativeLog(true);
  addNativeLogListener((level, text) => {
    let log = (t: string) => t; // noop
    // Uncomment to test:
    // ;({ log } = console)
    log(['[localplusplus]', level ? `[${level}]` : '', text].filter(Boolean).join(' '));
  });
} else {
  // Ensure native logging is disabled in production
  toggleNativeLog(false);
}

enableScreens();

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

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function AppContent() {
  const { theme } = useTheme();
  const navigationTheme = theme.dark ? DarkTheme : DefaultTheme;
  React.useEffect(() => {
    // Hard-cap contexts to one at a time to prevent double loads on iOS
    setContextLimit(1);
    return () => {
      // Best-effort cleanup of any lingering contexts on app teardown
      releaseAllLlama();
    };
  }, []);
  React.useEffect(() => {
    // Fetch Routstr models once at app startup and cache, without blocking first render
    const schedule = InteractionManager.runAfterInteractions(() => {
      setTimeout(async () => {
        try {
          await refreshAndCacheRoutstrModels();
        } catch {
          // ignore startup fetch failure
        }
      }, 0);
    });
    return () => schedule.cancel && schedule.cancel();
  }, []);
  const StackNavigator = () => (
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
      <Stack.Screen
        name="ModelManager"
        component={ModelManagerScreen}
        options={{ title: 'Model Manager' }}
      />
      <Stack.Screen
        name="RoutstrSettings"
        component={RoutstrSettingsScreen}
        options={{ title: 'Routstr Settings' }}
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
  );

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <NavigationContainer theme={navigationTheme}>
        <Drawer.Navigator
          id="RootDrawer"
          screenOptions={{
            drawerType: 'slide',
            headerShown: false,
            drawerStyle: { width: 320, backgroundColor: theme.colors.surface },
          }}
          drawerContent={() => <ChatDrawer />}
        >
          <Drawer.Screen name="MainStack" component={StackNavigator} />
        </Drawer.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
