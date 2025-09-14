import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import {
  createChatSession,
  deleteChatSession,
  loadChatSessionsIndex,
  loadCurrentChatId,
  renameChatSession,
  saveCurrentChatId,
  type SessionMeta,
} from '../utils/storage';
import { useTheme } from '../contexts/ThemeContext';

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) { return 'just now'; }
  const min = Math.floor(sec / 60);
  if (min < 60) { return `${min}m`; }
  const hr = Math.floor(min / 60);
  if (hr < 24) { return `${hr}h`; }
  const day = Math.floor(hr / 24);
  if (day < 7) { return `${day}d`; }
  const wk = Math.floor(day / 7);
  if (wk < 4) { return `${wk}w`; }
  const mo = Math.floor(day / 30);
  if (mo < 12) { return `${mo}mo`; }
  const yr = Math.floor(day / 365);
  return `${yr}y`;
}

export default function ChatDrawer() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<SessionMeta | null>(null);
  const [renameInput, setRenameInput] = useState('');

  const refresh = useCallback(async () => {
    const [index, cur] = await Promise.all([
      loadChatSessionsIndex(),
      loadCurrentChatId(),
    ]);
    const sorted = [...index].sort((a, b) => b.updatedAt - a.updatedAt);
    setSessions(sorted);
    setCurrentId(cur);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const handleCreate = useCallback(async () => {
    const meta = await createChatSession();
    await saveCurrentChatId(meta.id);
    setCurrentId(meta.id);
    await refresh();
    navigation.navigate('MainStack', { screen: 'SimpleChat', params: { chatId: meta.id } });
    navigation.dispatch(DrawerActions.closeDrawer());
  }, [navigation, refresh]);

  const handleSelect = useCallback(async (id: string) => {
    await saveCurrentChatId(id);
    setCurrentId(id);
    navigation.navigate('MainStack', { screen: 'SimpleChat', params: { chatId: id } });
    navigation.dispatch(DrawerActions.closeDrawer());
  }, [navigation]);

  const openRename = useCallback((item: SessionMeta) => {
    setRenameTarget(item);
    setRenameInput(item.title);
  }, []);

  const confirmDelete = useCallback((item: SessionMeta) => {
    Alert.alert('Delete Chat', `Delete "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const sorted = sessions;
        const isCurrent = currentId === item.id;
        if (isCurrent) {
          const fallback = sorted.find((s) => s.id !== item.id);
          if (fallback) {
            await saveCurrentChatId(fallback.id);
            navigation.navigate('MainStack', { screen: 'SimpleChat', params: { chatId: fallback.id } });
          } else {
            const created = await createChatSession();
            await saveCurrentChatId(created.id);
            navigation.navigate('MainStack', { screen: 'SimpleChat', params: { chatId: created.id } });
          }
        }
        await deleteChatSession(item.id);
        await refresh();
      } },
    ]);
  }, [currentId, navigation, refresh, sessions]);

  const renderItem = useCallback(({ item }: { item: SessionMeta }) => {
    const isActive = item.id === currentId;
    return (
      <TouchableOpacity
        onPress={() => void handleSelect(item.id)}
        onLongPress={() => openRename(item)}
        style={{
          paddingVertical: 10,
          paddingHorizontal: 12,
          backgroundColor: isActive ? theme.colors.card : 'transparent',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: isActive ? theme.colors.primary : theme.colors.border,
          marginBottom: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexShrink: 1, paddingRight: 8 }}>
            <Text style={{ color: theme.colors.text, fontWeight: '700' }} numberOfLines={1}>
              {item.title || 'New chat'}
            </Text>
            <Text style={{ color: theme.colors.textSecondary, marginTop: 2 }}>
              {formatRelativeTime(item.updatedAt)} · {item.messageCount}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => openRename(item)} style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>✎</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => confirmDelete(item)} style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [confirmDelete, currentId, handleSelect, openRename, theme.colors]);

  const content = useMemo(() => (
    <View style={{ flex: 1, paddingTop: 20, paddingHorizontal: 12, backgroundColor: theme.colors.surface }}>
      <TouchableOpacity
        onPress={() => void handleCreate()}
        style={{
          backgroundColor: theme.colors.primary,
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        <Text style={{ color: theme.colors.white, fontWeight: '700', textAlign: 'center' }}>New chat</Text>
      </TouchableOpacity>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={!!renameTarget} transparent animationType="fade" onRequestClose={() => setRenameTarget(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <View style={{ width: '100%', backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.colors.border }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: 8 }}>Rename Chat</Text>
            <TextInput
              value={renameInput}
              onChangeText={setRenameInput}
              placeholder="Enter title"
              placeholderTextColor={theme.colors.textSecondary}
              style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: theme.colors.text, height: 44 }}
              autoCapitalize="sentences"
              autoCorrect
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
              <TouchableOpacity onPress={() => setRenameTarget(null)} style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ color: theme.colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  const target = renameTarget;
                  const title = (renameInput || '').trim();
                  if (target && title.length > 0) {
                    await renameChatSession(target.id, title);
                    setRenameTarget(null);
                    await refresh();
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
    </View>
  ), [confirmDelete, handleCreate, renameInput, renameTarget, renderItem, sessions, theme.colors]);

  return content;
}

