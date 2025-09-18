import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SectionList } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { createThemedStyles } from '../styles/commonStyles';
import { MODELS } from '../utils/constants';
import ModelDownloadCard from '../components/ModelDownloadCard';
import CustomModelModal from '../components/CustomModelModal';
import { LocalModelCard } from '../components/ModelDownloadCard';
import type { CustomModel } from '../utils/storage';
import { loadCustomModels, loadRoutstrFavorites, saveRoutstrFavorites, loadRoutstrModelsCache } from '../utils/storage';
import { formatSatsCompact } from '../utils/pricing';
import { refreshAndCacheRoutstrModels } from '../services/RoutstrModelsService';
import RoutstrFilterModal, { type RoutstrFilter } from '../components/RoutstrFilterModal';

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
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filter, setFilter] = useState<RoutstrFilter>({});
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

  const extractProvider = (id: string, name: string): string => {
    const base = (id || name || '').toLowerCase();
    const idxSlash = base.indexOf('/');
    const idxColon = base.indexOf(':');
    const idxDot = base.indexOf('.');
    const candidates = [idxSlash, idxColon, idxDot].filter((i) => i > 0);
    if (candidates.length > 0) {return base.slice(0, Math.min(...candidates));}
    const dashIdx = base.indexOf('-');
    return dashIdx > 0 ? base.slice(0, dashIdx) : base;
  };

  const providerOptions = useMemo(() => {
    const set = new Set<string>();
    routstrModels.forEach((m) => set.add(extractProvider(m.id, m.name)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [routstrModels]);

  const isFilterActive = useMemo(() => {
    return !!(filter.searchTerm || filter.provider || typeof filter.maxSatPerToken === 'number');
  }, [filter]);

  const filteredOtherRoutstrModels = useMemo(() => {
    const term = (filter.searchTerm || '').toLowerCase();
    const provider = (filter.provider || '').toLowerCase();
    const maxPrice = filter.maxSatPerToken;
    return otherRoutstrModels.filter((m) => {
      if (term) {
        const hay = `${m.name} ${m.id}`.toLowerCase();
        if (!hay.includes(term)) {return false;}
      }
      if (provider) {
        if (extractProvider(m.id, m.name) !== provider) {return false;}
      }
      if (typeof maxPrice === 'number' && isFinite(maxPrice)) {
        if (!(typeof m.completionSatPerToken === 'number' && isFinite(m.completionSatPerToken))) {return false;}
        if (m.completionSatPerToken > maxPrice) {return false;}
      }
      return true;
    });
  }, [filter, otherRoutstrModels]);

  const clearFilter = () => setFilter({});

  return (
    <View style={themedStyles.container}>
      <View style={{ flexDirection: 'row', margin: 16, backgroundColor: theme.colors.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border }}>
        <TouchableOpacity onPress={() => setMode('local')} style={{ flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: mode === 'local' ? theme.colors.buttonBackground : theme.colors.surface, borderTopLeftRadius: 10, borderBottomLeftRadius: 10, borderRightWidth: 1, borderRightColor: theme.colors.border }}>
          <Text style={{ color: mode === 'local' ? theme.colors.white : theme.colors.text, fontWeight: '700', letterSpacing: 0.2 }}>Local</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMode('routstr')} style={{ flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: mode === 'routstr' ? theme.colors.buttonBackground : theme.colors.surface, borderTopRightRadius: 10, borderBottomRightRadius: 10 }}>
          <Text style={{ color: mode === 'routstr' ? theme.colors.white : theme.colors.text, fontWeight: '700', letterSpacing: 0.2 }}>Routstr</Text>
        </TouchableOpacity>
      </View>

      {mode === 'local' ? (
        <ScrollView contentContainerStyle={themedStyles.scrollContent}>
          {[...customModels.map((m) => (
            <LocalModelCard
              key={`custom-${m.id}`}
              kind="custom"
              model={m}
              onInitialize={() => {}}
              onDownloaded={async () => setCustomModels(await loadCustomModels())}
              onDelete={async () => setCustomModels(await loadCustomModels())}
              hideInitializeButton
            />
          )),
          ...defaultLocalModels.map(({ key, info }) => (
            <ModelDownloadCard
              key={`default-${key}`}
              title={info.name}
              repo={info.repo}
              filename={info.filename}
              size={info.size}
              hideInitializeButton
            />
          ))]}

          <TouchableOpacity
            style={themedStyles.addCustomModelButton}
            onPress={() => setShowCustomModelModal(true)}
          >
            <Text style={themedStyles.addCustomModelButtonText}>+ Add Custom Model</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <SectionList
            sections={[
              ...(favoriteRoutstrModels.length > 0
                ? [{ title: 'Added Models', kind: 'fav', data: favoriteRoutstrModels } as any]
                : []),
              { title: 'All Models', kind: 'all', data: filteredOtherRoutstrModels } as any,
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
              section.kind === 'fav' && filteredOtherRoutstrModels.length > 0 ? (
                <View style={{ height: 1, backgroundColor: theme.colors.border, marginHorizontal: 16, marginVertical: 8 }} />
              ) : null
            )}
            ListHeaderComponent={() => (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
                <Text style={themedStyles.modelSectionTitle}>Models</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {isFilterActive && (
                    <Text style={{ color: theme.colors.textSecondary, marginRight: 8 }}>Filtered</Text>
                  )}
                  {isFilterActive && (
                    <TouchableOpacity onPress={clearFilter} style={{ paddingHorizontal: 8, paddingVertical: 6, marginRight: 4 }}>
                      <Text style={{ color: theme.colors.error, fontWeight: '600' }}>Clear</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => setShowFilterModal(true)} style={{ paddingHorizontal: 8, paddingVertical: 6, marginRight: 4 }}>
                    <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Filter</Text>
                  </TouchableOpacity>
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

      <RoutstrFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onSave={(f) => setFilter(f)}
        onClear={() => { clearFilter(); setShowFilterModal(false); }}
        initialFilter={filter}
        providers={providerOptions}
      />
    </View>
  );
}


