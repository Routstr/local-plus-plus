import { AppRegistry } from 'react-native'
import notifee, { EventType } from '@notifee/react-native'
import BackgroundModelDownloadService from './src/services/BackgroundModelDownloadService'
import NativeCustomEvent from 'react-native/Libraries/Events/CustomEvent'
import App from './src/App.tsx'
import { name as appName } from './app.json'

// Setup for `mcp-sdk-client-ssejs` package
window.CustomEvent = class CustomEvent extends NativeCustomEvent {
  constructor(type, eventInitDict = {}) {
    super(type, eventInitDict)
  }
}

AppRegistry.registerComponent(appName, () => App)

// Register background event handler for notification actions (Android)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.ACTION_PRESS && detail.pressAction) {
    const id = detail.pressAction.id || ''
    const m = id.match(/^(pause|resume|cancel)-(.+)$/)
    if (m) {
      const action = m[1]
      const groupId = m[2]
      if (action === 'pause') { await BackgroundModelDownloadService.pause(groupId) }
      if (action === 'resume') { await BackgroundModelDownloadService.resume(groupId) }
      if (action === 'cancel') { await BackgroundModelDownloadService.cancel(groupId) }
    }
  }
})

// Ensure we rehydrate downloads on process start
BackgroundModelDownloadService.rehydrate().catch(() => {})

// Request notification permission (Android 13+) to ensure progress notifications are shown
notifee.requestPermission().catch(() => {})
