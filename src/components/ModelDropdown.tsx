import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  InteractionManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UnifiedModelItem from './UnifiedModelItem';
import type { UnifiedModelItemProps } from './UnifiedModelItem';
import { useTheme } from '../contexts/ThemeContext';

interface ModelGroup {
  title: string
  models: UnifiedModelItemProps[]
}

interface ModelDropdownProps {
  visible: boolean
  onClose: () => void
  selectedModelId?: string
  onSelectModel: (model: UnifiedModelItemProps) => void
  modelGroups: ModelGroup[]
  currentModelName?: string
  onAddCustomModel?: () => void
  onOpenSettings?: () => void
}

const createStyles = (theme: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  container: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: Platform.OS === 'ios' ? 60 : 50,
    maxHeight: Dimensions.get('window').height * 0.75,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
  },
  headerIconButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    margin: 0,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
  },
  headerIconText: {
    fontSize: 18,
    color: theme.colors.textSecondary,
  },
  headerIconContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 6,
  },
  currentModel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addCustomButton: {
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  addCustomText: {
    fontSize: 15,
    color: theme.colors.primary,
    textAlign: 'center',
    fontWeight: '500',
  },
  scrollView: {
    maxHeight: Dimensions.get('window').height * 0.6,
  },
  footer: {
    paddingVertical: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 14,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default function ModelDropdown({
  visible,
  onClose,
  selectedModelId,
  onSelectModel,
  modelGroups,
  currentModelName,
  onAddCustomModel,
  onOpenSettings,
}: ModelDropdownProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const [canDismiss, setCanDismiss] = useState(false);
  const [isRendered, setIsRendered] = useState<boolean>(visible);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      setCanDismiss(false);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setCanDismiss(true));
    } else if (isRendered) {
      setCanDismiss(false);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -20,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) { setIsRendered(false); }
      });
    }
  }, [visible, isRendered, fadeAnim, slideAnim]);

  const handleSelectModel = (model: UnifiedModelItemProps) => {
    if (!canDismiss) { return; }
    onClose();
    const run = () => onSelectModel(model);
    if (Platform.OS === 'ios') {
      requestAnimationFrame(() => {
        InteractionManager.runAfterInteractions(() => {
          setTimeout(run, 0);
        });
      });
    } else {
      setTimeout(run, 0);
    }
  };

  return (
    <Modal
      visible={isRendered}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => {
            if (!canDismiss) {return;}
            onClose();
          }}
        >
          <Animated.View
            style={[
              styles.container,
              {
                transform: [{ translateY: slideAnim }],
                marginTop: insets.top + (Platform.OS === 'ios' ? 60 : 50),
              },
            ]}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <Text style={styles.headerText}>Select Model</Text>
                {onOpenSettings && (
                  <TouchableOpacity
                    style={styles.headerIconButton}
                    onPress={() => {
                      if (!canDismiss) {return;}
                      onClose();
                      // Defer to allow overlay fade
                      setTimeout(() => {
                        onOpenSettings?.();
                      }, 50);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <View style={styles.headerIconContent}>
                      <Text style={styles.headerIconText}>⚙︎</Text>
                      <Text style={styles.headerIconLabel}>Configure</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {modelGroups.some((g) => g.models.length > 0) ? (
                <>
                  {modelGroups.map((group, index) => (
                    <View key={`group-${index}`}>
                      <Text style={styles.groupTitle}>{group.title}</Text>
                      {group.models.length > 0 ? group.models.map((model) => (
                        <UnifiedModelItem
                          key={model.id}
                          {...model}
                          isSelected={model.id === selectedModelId}
                          onSelect={() => handleSelectModel(model)}
                        />
                      )) : (
                        group.title === 'Local Models' ? (
                          <View style={styles.emptyContainer}>
                            <Text style={styles.emptyTitle}>No downloaded models yet</Text>
                            <Text style={styles.emptySubtitle}>Download a local model to use it here.</Text>
                            {!!onOpenSettings && (
                              <TouchableOpacity
                                style={styles.emptyButton}
                                onPress={() => {
                                  if (!canDismiss) {return;}
                                  onClose();
                                  setTimeout(() => onOpenSettings?.(), 50);
                                }}
                              >
                                <Text style={styles.emptyButtonText}>Open Model Manager</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ) : null
                      )}
                    </View>
                  ))}
                  <View style={styles.footer} />
                </>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No downloaded models yet</Text>
                  <Text style={styles.emptySubtitle}>Download a local model to use it here.</Text>
                  {!!onOpenSettings && (
                    <TouchableOpacity
                      style={styles.emptyButton}
                      onPress={() => {
                        if (!canDismiss) {return;}
                        onClose();
                        setTimeout(() => onOpenSettings?.(), 50);
                      }}
                    >
                      <Text style={styles.emptyButtonText}>Open Model Manager</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}
