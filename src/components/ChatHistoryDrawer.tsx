import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Animated, Easing, FlatList, Platform } from 'react-native';
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
  onNewChat,
  onResetCurrentChat,
}: ChatHistoryDrawerProps) {
  const { theme } = useTheme();
  const themedStyles = createThemedStyles(theme.colors);
  const drawerWidth = Math.round(Math.min(320, Dimensions.get('window').width * 0.82));
  const translateX = useRef(new Animated.Value(-drawerWidth)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const [isRendered, setIsRendered] = useState<boolean>(visible);

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
                <View style={{ backgroundColor: isActive ? theme.colors.card : theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <TouchableOpacity onPress={() => onSelectSession(item.id)} style={{ flexShrink: 1, paddingRight: 10 }}>
                      <Text numberOfLines={1} style={{ color: theme.colors.text, fontSize: 16, fontWeight: '600' }}>
                        {item.title || 'Untitled Chat'}
                      </Text>
                      <Text numberOfLines={1} style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                        {new Date(item.updatedAt).toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onDeleteSession(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Icon name="trash-can-outline" size={22} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      </Animated.View>
    </View>
  );
}


