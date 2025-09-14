import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SectionList } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { createThemedStyles } from '../styles/commonStyles';
import { MODELS } from '../utils/constants';
import ModelDownloadCard from '../components/ModelDownloadCard';
import BackgroundModelDownloadService from '../services/BackgroundModelDownloadService';
import CustomModelModal from '../components/CustomModelModal';
import CustomModelCard from '../components/CustomModelCard';
import type { CustomModel } from '../utils/storage';
import { loadCustomModels, loadRoutstrFavorites, saveRoutstrFavorites, loadRoutstrModelsCache } from '../utils/storage';
import { formatSatsCompact } from '../utils/pricing';
import { refreshAndCacheRoutstrModels } from '../services/RoutstrModelsService';

export default function ModelManagerScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const themedStyles = createThemedStyles(theme.colors);
  const [customModels, setCustomModels] = useState<CustomModel[]>([]);
  const [showCustomModelModal, setShowCustomModelModal] = useState(false);
  const [mode, setMode] = useState<'local' | 'routstr'>('local');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [routstrModels, setRoutstrModels] = useState<Array<{ id: string; name: string; maxCost: number; completionSatPerToken?: number }>>([]);
  const [isLoadingRoutstr, setIsLoadingRoutstr] = useState(false);
  const [routstrError, setRoutstrError] = useState<string | null>(null);
  const [activeGroups, setActiveGroups] = useState<Array<{ id: string; title: string; percentage: number }>>([]);
  // debug removed

  useEffect(() => {
    navigation.setOptions({ title: 'Model Manager' });
  }, [navigation]);

  useEffect(() => {
    const load = async () => {
      setCustomModels(await loadCustomModels());
      setFavorites(await loadRoutstrFavorites());
    };
    load();
  }, []);

  useEffect(() => {
    // Rehydrate and subscribe to any active groups to show in a tray
    BackgroundModelDownloadService.rehydrate().then(async () => {
      const { loadBackgroundDownloadGroups } = await import('../utils/storage');
      const groups = await loadBackgroundDownloadGroups();
      const actives = groups.filter(g => g.status === 'running' || g.status === 'paused' || g.status === 'queued');
      setActiveGroups(actives.map(g => ({ id: g.id, title: g.title, percentage: g.percentage })));
      actives.forEach(g => {
        BackgroundModelDownloadService.subscribe(g.id, (p) => {
          setActiveGroups((prev) => {
            const map = new Map(prev.map(x => [x.id, x] as const));
            map.set(g.id, { id: g.id, title: g.title, percentage: p.percentage });
            return Array.from(map.values());
          });
        });
      });
    }).catch(() => {});
  }, []);

  const addFavorite = async (id: string) => {
    if (favorites.includes(id)) {return;}
    const next = [...favorites, id];
    setFavorites(next);
    await saveRoutstrFavorites(next);
  };

  const removeFavorite = async (id: string) => {
    if (!favorites.includes(id)) {return;}
    const next = favorites.filter((f) => f !== id);
    setFavorites(next);
    await saveRoutstrFavorites(next);
  };

  const fetchRoutstrModels = async () => {
    try {
      setIsLoadingRoutstr(true);
      setRoutstrError(null);
      await refreshAndCacheRoutstrModels();
      const cached = await loadRoutstrModelsCache();
      setRoutstrModels(cached);
    } catch (e: any) {
      setRoutstrError(e?.message || 'Failed to load models');
      const cached = await loadRoutstrModelsCache();
      setRoutstrModels(cached);
    } finally {
      setIsLoadingRoutstr(false);
    }
  };

  useEffect(() => {
    if (mode !== 'routstr') {return;}
    let mounted = true;
    // synchronous attempt: use in-memory cache immediately
    loadRoutstrModelsCache().then((cached) => {
      if (mounted) {setRoutstrModels(cached);}
    });
    return () => { mounted = false; };
  }, [mode]);

  const defaultLocalModels = useMemo(() => (
    ['SMOL_LM_3', 'GEMMA_3_4B_QAT', 'QWEN_3_4B'] as const
  ).map((k) => ({ key: k, info: MODELS[k] })), []);

  const favoriteRoutstrModels = useMemo(
    () => routstrModels.filter((m) => favorites.includes(m.id)),
    [routstrModels, favorites],
  );
  const otherRoutstrModels = useMemo(
    () => routstrModels.filter((m) => !favorites.includes(m.id)),
    [routstrModels, favorites],
  );

  return (
    <View style={themedStyles.container}>
      <View style={{ flexDirection: 'row', margin: 16, backgroundColor: theme.colors.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border }}>
        <TouchableOpacity onPress={() => setMode('local')} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: mode === 'local' ? theme.colors.primary : 'transparent', borderTopLeftRadius: 10, borderBottomLeftRadius: 10 }}>
          <Text style={{ color: mode === 'local' ? theme.colors.white : theme.colors.text, fontWeight: '600' }}>Local</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMode('routstr')} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: mode === 'routstr' ? theme.colors.primary : 'transparent', borderTopRightRadius: 10, borderBottomRightRadius: 10 }}>
          <Text style={{ color: mode === 'routstr' ? theme.colors.white : theme.colors.text, fontWeight: '600' }}>Routstr</Text>
        </TouchableOpacity>
      </View>

      {mode === 'local' ? (
        <ScrollView contentContainerStyle={themedStyles.scrollContent}>
          {activeGroups.length > 0 && (
            <View style={{ marginHorizontal: 16, marginBottom: 8, padding: 12, backgroundColor: theme.colors.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border }}>
              <Text style={{ fontWeight: '600', color: theme.colors.text, marginBottom: 8 }}>Active Downloads</Text>
              {activeGroups.map(g => (
                <View key={g.id} style={{ marginVertical: 6 }}>
                  <Text style={{ color: theme.colors.textSecondary }}>{g.title}</Text>
                  <View style={{ height: 4, backgroundColor: theme.colors.border, borderRadius: 2, marginTop: 4 }}>
                    <View style={{ width: `${g.percentage}%`, height: '100%', backgroundColor: theme.colors.primary, borderRadius: 2 }} />
                  </View>
                </View>
              ))}
            </View>
          )}
          {defaultLocalModels.map(({ key, info }) => (
            <ModelDownloadCard
              key={key}
              title={info.name}
              repo={info.repo}
              filename={info.filename}
              size={info.size}
              onInitialize={() => {}}
              initializeButtonText="Downloaded"
            />
          ))}

          <TouchableOpacity
            style={themedStyles.addCustomModelButton}
            onPress={() => setShowCustomModelModal(true)}
          >
            <Text style={themedStyles.addCustomModelButtonText}>+ Add Custom Model</Text>
          </TouchableOpacity>

          {customModels.map((m) => (
            <CustomModelCard
              key={m.id}
              model={m}
              onInitialize={() => {}}
              onModelRemoved={async () => setCustomModels(await loadCustomModels())}
              initializeButtonText="Installed"
            />
          ))}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <SectionList
            sections={[
              ...(favoriteRoutstrModels.length > 0
                ? [{ title: 'Added Models', kind: 'fav', data: favoriteRoutstrModels } as any]
                : []),
              { title: 'All Models', kind: 'all', data: otherRoutstrModels } as any,
            ]}
            keyExtractor={(item) => item.id}
            renderItem={({ item, section }) => (
              <View style={{ backgroundColor: theme.colors.surface, borderRadius: 12, marginHorizontal: 16, marginVertical: 8, padding: 16, borderWidth: 1, borderColor: theme.colors.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                    <Text style={{ fontSize: 18, fontWeight: '600', color: theme.colors.text, flexShrink: 1, flexWrap: 'wrap' }}>{item.name}</Text>
                    <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, flexShrink: 1 }}>
                      {typeof item.completionSatPerToken === 'number' && isFinite(item.completionSatPerToken) && (
                        (() => {
                          const value = item.completionSatPerToken * 500;
                          return `~ ${formatSatsCompact(value)} sat / msg`;
                        })()
                      )}
                    </Text>
                  </View>
                  {section.kind === 'fav' ? (
                    <TouchableOpacity
                      onPress={() => removeFavorite(item.id)}
                      style={{ paddingHorizontal: 10, paddingVertical: 8, backgroundColor: theme.colors.error, borderRadius: 8 }}
                    >
                      <Text style={{ color: theme.colors.white, fontSize: 16 }}>—</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => addFavorite(item.id)}
                      style={{ paddingHorizontal: 10, paddingVertical: 8, backgroundColor: theme.colors.primary, borderRadius: 8 }}
                    >
                      <Text style={{ color: theme.colors.white, fontSize: 16 }}>＋</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
            renderSectionHeader={() => null}
            renderSectionFooter={({ section }) => (
              section.kind === 'fav' && otherRoutstrModels.length > 0 ? (
                <View style={{ height: 1, backgroundColor: theme.colors.border, marginHorizontal: 16, marginVertical: 8 }} />
              ) : null
            )}
            ListHeaderComponent={() => (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
                <Text style={themedStyles.modelSectionTitle}>Models</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => navigation.navigate('RoutstrSettings')} style={{ paddingHorizontal: 8, paddingVertical: 6, marginRight: 4 }}>
                    <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Configure</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => fetchRoutstrModels()} style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
                    <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Refresh</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={() => (
              <View>
                {isLoadingRoutstr && (
                  <Text style={{ color: theme.colors.textSecondary, marginHorizontal: 16 }}>Loading models…</Text>
                )}
                {!!routstrError && (
                  <Text style={{ color: theme.colors.error, marginHorizontal: 16 }}>{routstrError}</Text>
                )}
                {!isLoadingRoutstr && !routstrError && (
                  <Text style={{ color: theme.colors.textSecondary, marginHorizontal: 16 }}>Could not fetch any models.</Text>
                )}
              </View>
            )}
            stickySectionHeadersEnabled
            removeClippedSubviews
            initialNumToRender={20}
            windowSize={10}
            maxToRenderPerBatch={20}
            contentContainerStyle={themedStyles.scrollContent}
          />
        </View>
      )}

      <CustomModelModal
        visible={showCustomModelModal}
        onClose={() => setShowCustomModelModal(false)}
        onModelAdded={async () => setCustomModels(await loadCustomModels())}
        title="Add Custom Model"
        enableFileSelection
      />
    </View>
  );
}


