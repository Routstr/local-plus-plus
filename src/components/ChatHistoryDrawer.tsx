import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Animated, Easing, FlatList, Platform, Modal, TextInput } from 'react-native';
import Icon from '@react-native-vector-icons/material-design-icons';
import { createThemedStyles } from '../styles/commonStyles';
import { useTheme } from '../contexts/ThemeContext';
import type { ChatSessionMeta } from '../utils/storage';

interface ChatHistoryDrawerProps {
  visible: boolean
  onClose: () => void
  sessions: ChatSessionMeta[]
  activeSessionId: string | null
  onSelectSession: (id: string) => void
  onDeleteSession: (id: string) => void
  onRenameSession?: (id: string, title: string) => void
  onNewChat: () => void
  onResetCurrentChat?: () => void
}

export default function ChatHistoryDrawer({
  visible,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onNewChat,
  onResetCurrentChat,
}: ChatHistoryDrawerProps) {
  const { theme } = useTheme();
  const themedStyles = createThemedStyles(theme.colors);
  const drawerWidth = Math.round(Math.min(320, Dimensions.get('window').width * 0.82));
  const translateX = useRef(new Animated.Value(-drawerWidth)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const [isRendered, setIsRendered] = useState<boolean>(visible);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameInput, setRenameInput] = useState('');
  const [renameSessionId, setRenameSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    } else if (isRendered) {
      Animated.parallel([
        Animated.timing(translateX, { toValue: -drawerWidth, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) {
          setIsRendered(false);
        }
      });
    }
  }, [visible, isRendered, drawerWidth, translateX, overlayOpacity]);

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [sessions]);

  if (!isRendered) {
    return null;
  }

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}>
      <Animated.View
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.4)', opacity: overlayOpacity }}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: drawerWidth, transform: [{ translateX }], backgroundColor: theme.colors.surface, borderRightWidth: 1, borderRightColor: theme.colors.border }}
      >
        <View style={{ paddingTop: Platform.OS === 'ios' ? 52 : 24, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '700' }}>Chats</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={onNewChat} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="plus" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <FlatList
          data={sortedSessions}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => {
            const isActive = item.id === activeSessionId;
            return (
              <View style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
                <TouchableOpacity
                  onPress={() => onSelectSession(item.id)}
                  onLongPress={() => {
                    setRenameSessionId(item.id);
                    setRenameInput(item.title || '');
                    setShowRenameModal(true);
                  }}
                  delayLongPress={300}
                  activeOpacity={0.8}
                  style={{ backgroundColor: isActive ? theme.colors.card : theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexShrink: 1, paddingRight: 10 }}>
                      <Text numberOfLines={1} style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600' }}>
                        {item.title || 'Untitled Chat'}
                      </Text>
                      <Text numberOfLines={1} style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                        {new Date(item.updatedAt).toLocaleString()}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => onDeleteSession(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Icon name="trash-can-outline" size={22} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </View>
            );
          }}
        />
        <Modal visible={showRenameModal} transparent animationType="fade" onRequestClose={() => setShowRenameModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <View style={{ width: '100%', backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.colors.border }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: 8 }}>Rename Chat</Text>
              <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginBottom: 12 }}>Long-pressed title. Enter a new name for this chat.</Text>
              <TextInput
                value={renameInput}
                onChangeText={setRenameInput}
                placeholder="Untitled Chat"
                placeholderTextColor={theme.colors.textSecondary}
                style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.text, height: 44 }}
                autoCapitalize="none"
                autoCorrect={false}
                numberOfLines={1}
                multiline={false}
                returnKeyType="done"
                onSubmitEditing={() => {
                  const title = renameInput.trim();
                  if (!title || !renameSessionId) { return; }
                  if (onRenameSession) { onRenameSession(renameSessionId, title); }
                  setShowRenameModal(false);
                  setRenameSessionId(null);
                }}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
                <TouchableOpacity onPress={() => { setShowRenameModal(false); setRenameSessionId(null); }} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Text style={{ color: theme.colors.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const title = renameInput.trim();
                    if (!title || !renameSessionId) { return; }
                    if (onRenameSession) { onRenameSession(renameSessionId, title); }
                    setShowRenameModal(false);
                    setRenameSessionId(null);
                  }}
                  style={{ paddingHorizontal: 12, paddingVertical: 8 }}
                >
                  <Text style={{ color: theme.colors.primary, fontWeight: '700', opacity: renameInput.trim() ? 1 : 0.5 }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </Animated.View>
    </View>
  );
}


