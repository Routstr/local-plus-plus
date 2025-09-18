import { StyleSheet } from 'react-native';
import { defaultTheme as defaultLightTheme, darkTheme as defaultDarkTheme } from  '@flyerhq/react-native-chat-ui';
import type { ThemeColors } from '../contexts/ThemeContext';

export const chatLightTheme = {
  ...defaultLightTheme,
  borders: {
    ...defaultLightTheme.borders,
    messageBorderRadius: 8,
    inputBorderRadius: 8,
  },
  colors: {
    ...defaultLightTheme.colors,
    background: '#FFFFFF',
    primary: '#111111',
    secondary: '#FFFFFF',
    inputBackground: '#FFFFFF',
    inputText: '#0A0A0A',
    error: '#EF4444',
    receivedMessageDocumentIcon: '#71717A',
    sentMessageDocumentIcon: '#71717A',
    userAvatarImageBackground: '#E4E4E7',
    userAvatarNameColors: ['#0A0A0A', '#111111', '#3F3F46', '#52525B', '#71717A', '#A1A1AA', '#D4D4D8'],
  },
};

export const chatDarkTheme = {
  ...defaultDarkTheme,
  borders: {
    ...defaultDarkTheme.borders,
    messageBorderRadius: 8,
    inputBorderRadius: 8,
  },
  colors: {
    ...defaultDarkTheme.colors,
    background: '#09090B',
    primary: '#FAFAFA',
    secondary: '#0F0F10',
    inputBackground: '#0F0F10',
    inputText: '#FAFAFA',
    error: '#EF4444',
    receivedMessageDocumentIcon: '#A1A1AA',
    sentMessageDocumentIcon: '#A1A1AA',
    userAvatarImageBackground: '#18181B',
    userAvatarNameColors: ['#FAFAFA', '#E5E5E5', '#D4D4D8', '#A1A1AA', '#71717A', '#52525B', '#3F3F46'],
  },
};

// Common spacing values
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

// Common font sizes
export const FontSizes = {
  small: 12,
  medium: 14,
  large: 16,
  xlarge: 18,
  xxlarge: 24,
} as const;

// Function to create themed styles
export const createThemedStyles = (colors: ThemeColors) => {
  const isDark = ['#000000', '#09090B'].includes(colors.background);

  return StyleSheet.create({
    // Container styles
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    setupContainer: {
      flex: 1,
      padding: Spacing.lg,
    },
    scrollContent: {
      paddingBottom: 20,
    },

    // Header styles
    header: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      shadowColor: 'transparent',
      elevation: 0,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: FontSizes.xlarge,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    headerButton: {
      marginRight: 4,
    },
    headerButtonText: {
      color: colors.primary,
      fontSize: FontSizes.large,
      fontWeight: '600',
    },

    // Text styles
    setupDescription: {
      fontSize: FontSizes.large,
      color: colors.textSecondary,
      lineHeight: 24,
      marginBottom: Spacing.xxl,
      textAlign: 'center',
    },
    description: {
      fontSize: FontSizes.medium,
      color: colors.textSecondary,
      lineHeight: 20,
      marginVertical: Spacing.lg,
      textAlign: 'center',
    },

    // Button styles
    button: {
      margin: 10,
      padding: 10,
      backgroundColor: colors.buttonBackground,
      borderRadius: 8,
    },
    buttonText: {
      color: colors.white,
      fontSize: FontSizes.large,
      fontWeight: '600',
    },
    primaryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.md,
      borderRadius: 10,
    },
    primaryButtonText: {
      color: colors.white,
      fontSize: FontSizes.large,
      fontWeight: '700',
    },
    primaryButtonDisabled: {
      backgroundColor: colors.disabled,
    },
    primaryButtonActive: {
      backgroundColor: isDark ? '#3F3F46' : '#0A0A0A',
      transform: [{ scale: 0.98 }],
    },
    secondaryButton: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      backgroundColor: colors.error,
      borderRadius: 8,
    },
    secondaryButtonText: {
      color: colors.white,
      fontSize: FontSizes.medium,
      fontWeight: '600',
    },
    textButton: {
      fontSize: FontSizes.large,
      color: colors.primary,
      fontWeight: '500',
    },
    disabledButton: {
      opacity: 0.5,
    },

    // Loading styles
    loadingContainer: {
      alignItems: 'center',
      marginTop: Spacing.xxl,
    },
    loadingText: {
      marginTop: Spacing.sm,
      fontSize: FontSizes.large,
      color: colors.textSecondary,
    },

    // Progress bar styles
    progressContainer: {
      marginTop: Spacing.lg,
      width: '100%',
      alignItems: 'center',
    },
    progressBar: {
      width: '80%',
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 4,
    },

    // Card styles
    card: {
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: Spacing.lg,
      marginVertical: Spacing.sm,
      marginHorizontal: Spacing.lg,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.06,
      shadowRadius: isDark ? 4 : 3,
      elevation: 1,
    },

    // Form styles
    paramGroup: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
    },
    paramLabel: {
      fontSize: FontSizes.large,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    paramDescription: {
      fontSize: FontSizes.medium,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: Spacing.md,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: Spacing.md,
      paddingVertical: 10,
      fontSize: FontSizes.large,
      backgroundColor: colors.inputBackground,
      color: colors.text,
    },
    singleLineInput: {
      height: 44,
    },

    // Modal styles
    modalContainer: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: Spacing.xl,
      margin: Spacing.xl,
      maxHeight: '80%',
      maxWidth: '95%',
      minWidth: '85%',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.35 : 0.15,
      shadowRadius: isDark ? 8 : 6,
      elevation: 3,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: FontSizes.xlarge,
      fontWeight: '700',
      color: colors.text,
    },
    modalCloseButton: {
      fontSize: FontSizes.xlarge,
      color: colors.primary,
      fontWeight: '600',
    },

    // Settings styles
    settingsContainer: {
      alignItems: 'center',
      marginVertical: Spacing.lg,
    },

    // Utility styles
    flexRow: {
      flexDirection: 'row',
    },
    flexColumn: {
      flexDirection: 'column',
    },
    alignCenter: {
      alignItems: 'center',
    },
    justifyCenter: {
      justifyContent: 'center',
    },
    justifyBetween: {
      justifyContent: 'space-between',
    },
    flex1: {
      flex: 1,
    },
    marginBottom: {
      marginBottom: Spacing.lg,
    },
    marginTop: {
      marginTop: Spacing.lg,
    },

    // Custom Model Styles
    modelSectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginTop: 8,
      marginBottom: 8,
      letterSpacing: -0.3,
    },
    addCustomModelButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 14,
      paddingHorizontal: 20,
      marginHorizontal: 16,
      marginVertical: 12,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.18,
      shadowRadius: isDark ? 6 : 5,
      elevation: 2,
    },
    addCustomModelButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: -0.2,
    },
    customModelDefaultSection: {
      marginTop: 8,
    },
  });
};
