import React from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import type { EdgeInsets } from 'react-native-safe-area-context'
import type { LlamaContext } from 'llama.rn'
import { useTheme } from '../contexts/ThemeContext'

interface StopButtonProps {
  context: LlamaContext | null
  insets: EdgeInsets
  isLoading: boolean
}

export const StopButton: React.FC<StopButtonProps> = ({
  context,
  insets,
  isLoading,
}) => {
  const { theme } = useTheme()

  const styles = StyleSheet.create({
    stopButtonContainer: {
      position: 'absolute',
      right: 12,
      backgroundColor: theme.colors.error,
      width: 28,
      height: 28,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    stopButtonText: {
      color: theme.colors.white,
      fontSize: 18,
      fontWeight: '700',
    },
  })

  if (!isLoading) {
    return null
  }

  return (
    <TouchableOpacity
      style={[styles.stopButtonContainer, { bottom: insets.bottom + 14 }]}
      onPress={() => {
        if (context) {
          context.stopCompletion()
        }
      }}
    >
      {/* <Text style={styles.stopButtonText}>■</Text> */}
    </TouchableOpacity>
  )
}
