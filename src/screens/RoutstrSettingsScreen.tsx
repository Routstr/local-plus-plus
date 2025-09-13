import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { createThemedStyles } from '../styles/commonStyles';
import { loadRoutstrToken, saveRoutstrToken, loadRoutstrBaseUrl, saveRoutstrBaseUrl, resetRoutstrBaseUrl, DEFAULT_ROUTSTR_BASE_URL } from '../utils/storage';
import { fetchRoutstrWalletInfo, topupRoutstrWallet, refundRoutstrWallet } from '../services/RoutstrWalletService';
import Clipboard from '@react-native-clipboard/clipboard';

export default function RoutstrSettingsScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const themedStyles = createThemedStyles(theme.colors);
  const [token, setToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [balanceMsats, setBalanceMsats] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [topupToken, setTopupToken] = useState<string>('');
  const [isTopupLoading, setIsTopupLoading] = useState<boolean>(false);
  const [topupError, setTopupError] = useState<string | null>(null);
  const [topupSuccess, setTopupSuccess] = useState<string | null>(null);
  const [refundResult, setRefundResult] = useState<string>('');
  const [isRefundLoading, setIsRefundLoading] = useState<boolean>(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [showTopupUI, setShowTopupUI] = useState<boolean>(false);

  useEffect(() => {
    navigation.setOptions({ title: 'Routstr Settings' });
  }, [navigation]);

  useEffect(() => {
    const init = async () => {
      const [t, b] = await Promise.all([
        loadRoutstrToken(),
        loadRoutstrBaseUrl(),
      ]);
      setToken(t || '');
      setBaseUrl(b || DEFAULT_ROUTSTR_BASE_URL);
      setIsLoading(false);
    };
    init();
  }, []);

  const refreshBalance = async (explicitToken?: string) => {
    try {
      setIsLoadingBalance(true);
      setBalanceError(null);
      const info = await fetchRoutstrWalletInfo(explicitToken);
      const next = Math.max(0, Math.round(Number(info.balance) || 0));
      setBalanceMsats(next);
    } catch (e: any) {
      setBalanceError('Failed to fetch balance');
      setBalanceMsats(null);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const onTopup = async () => {
    if (!token.trim() || !topupToken.trim()) { return; }
    try {
      setIsTopupLoading(true);
      setTopupError(null);
      setTopupSuccess(null);
      const credited = await topupRoutstrWallet(topupToken.trim(), token.trim());
      setTopupSuccess(`Credited ${credited.toLocaleString()} msats`);
      setTopupToken('');
      await refreshBalance(token.trim());
    } catch (e: any) {
      setTopupError(e?.message || 'Top up failed');
    } finally {
      setIsTopupLoading(false);
    }
  };

  const onRefund = async () => {
    if (!token.trim()) { return; }
    try {
      const previousToken = token.trim();
      setToken('');
      setBalanceMsats(0);
      setShowTopupUI(false);
      setTopupToken('');
      setTopupError(null);
      setTopupSuccess(null);
      setIsDirty(false);
      void saveRoutstrToken('');
      setIsRefundLoading(true);
      setRefundError(null);
      const res = await refundRoutstrWallet(previousToken);
      const text = res.token ? res.token : (res.recipient ? `Sent to ${res.recipient}` : JSON.stringify(res));
      setRefundResult(text);
      if (text) { Clipboard.setString(text); }
    } catch (e: any) {
      setRefundError(e?.message || 'Refund failed');
      // restore token if refund failed
      const prev = await loadRoutstrToken();
      setToken(prev || '');
    } finally {
      setIsRefundLoading(false);
    }
  };

  useEffect(() => {
    if (isLoading) { return; }
    const id = setTimeout(() => {
      void saveRoutstrToken(token.trim());
      void saveRoutstrBaseUrl(baseUrl.trim());
      if (token.trim()) { void refreshBalance(token.trim()); } else { setBalanceMsats(null); }
      setIsDirty(false);
    }, 250);
    return () => clearTimeout(id);
  }, [token, baseUrl, isLoading]);

  const onResetBaseUrl = async () => {
    await resetRoutstrBaseUrl();
    setBaseUrl(DEFAULT_ROUTSTR_BASE_URL);
    setIsDirty(true);
  };

  return (
    <View style={themedStyles.container}>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.text, marginBottom: 8 }}>
          API Token
        </Text>
        <Text style={{ color: theme.colors.textSecondary, marginBottom: 12 }}>
          Enter your Routstr API token. This is used when calling cloud models.
        </Text>
        <TextInput
          value={token}
          onChangeText={(v) => { setToken(v); setIsDirty(true); }}
          placeholder="Paste token"
          placeholderTextColor={theme.colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          numberOfLines={1}
          multiline={false}
          style={[themedStyles.textInput, themedStyles.singleLineInput]}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: theme.colors.text, fontWeight: '600' }}>
              {isLoadingBalance ? 'Loading…' : balanceMsats != null ? `${balanceMsats.toLocaleString()} msats` : '—'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => token.trim() && refreshBalance(token.trim())}
              style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: theme.colors.primary }}
            >
              <Text style={{ color: theme.colors.white, fontWeight: '600' }}>🔄</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowTopupUI((v) => !v)} disabled={!token.trim()} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, marginLeft: 8, backgroundColor: (!token.trim()) ? theme.colors.border : theme.colors.primary }}>
              <Text style={{ color: theme.colors.white, fontWeight: '600' }}>Top up</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onRefund} disabled={!token.trim() || isRefundLoading || (balanceMsats ?? 0) <= 0} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, marginLeft: 8, backgroundColor: (!token.trim() || isRefundLoading || (balanceMsats ?? 0) <= 0) ? theme.colors.border : theme.colors.error }}>
              <Text style={{ color: theme.colors.white, fontWeight: '600' }}>{isRefundLoading ? 'Refunding…' : 'Refund'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        {!!balanceError && (
          <Text style={{ color: theme.colors.error, marginTop: 8 }}>{balanceError}</Text>
        )}



        {showTopupUI && (
          <View style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <TextInput
                  value={topupToken}
                  onChangeText={(v) => { setTopupToken(v); setTopupSuccess(null); setTopupError(null); }}
                  placeholder="cashu..."
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  numberOfLines={1}
                  multiline={false}
                  style={[themedStyles.textInput, themedStyles.singleLineInput]}
                />
              </View>
              <TouchableOpacity onPress={onTopup} disabled={!token.trim() || !topupToken.trim() || isTopupLoading} style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6, marginLeft: 8, backgroundColor: (!token.trim() || !topupToken.trim() || isTopupLoading) ? theme.colors.border : theme.colors.primary }}>
                <Text style={{ color: theme.colors.white, fontWeight: '600' }}>{isTopupLoading ? 'Adding…' : 'Add'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowTopupUI(false)} style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6, marginLeft: 8, backgroundColor: theme.colors.border }}>
                <Text style={{ color: theme.colors.text, fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
            {!!topupSuccess && (
              <Text style={{ color: theme.colors.primary, marginTop: 8 }}>{topupSuccess}</Text>
            )}
            {!!topupError && (
              <Text style={{ color: theme.colors.error, marginTop: 8 }}>{topupError}</Text>
            )}
          </View>
        )}

        {(refundResult || refundError || isRefundLoading) ? (
          <View style={{ marginTop: 10 }}>
            {!!refundError && (
              <Text style={{ color: theme.colors.error, marginBottom: 8 }}>{refundError}</Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <TextInput
                  value={isRefundLoading ? 'Refunding…' : refundResult}
                  placeholder="Refund result will appear here"
                  placeholderTextColor={theme.colors.textSecondary}
                  editable={false}
                  style={[themedStyles.textInput, themedStyles.singleLineInput, { opacity: refundResult ? 1 : 0.9 }]}
                />
              </View>
              <TouchableOpacity onPress={() => refundResult && Clipboard.setString(refundResult)} disabled={!refundResult} style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6, marginLeft: 8, backgroundColor: refundResult ? theme.colors.primary : theme.colors.border }}>
                <Text style={{ color: theme.colors.white, fontWeight: '600' }}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setRefundResult(''); setRefundError(null); }} style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6, marginLeft: 8, backgroundColor: theme.colors.border }}>
                <Text style={{ color: theme.colors.text, fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        <Text style={{ fontSize: 20, fontWeight: '700', color: theme.colors.text, marginBottom: 8, marginTop: 20 }}>
          Base URL
        </Text>
        <Text style={{ color: theme.colors.textSecondary, marginBottom: 12 }}>
          Change the Routstr API base URL if you are using a custom endpoint.
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <TextInput
              value={baseUrl}
              onChangeText={(v) => { setBaseUrl(v); setIsDirty(true); }}
              placeholder={DEFAULT_ROUTSTR_BASE_URL}
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              numberOfLines={1}
              multiline={false}
              style={[themedStyles.textInput, themedStyles.singleLineInput]}
            />
          </View>
          <TouchableOpacity onPress={onResetBaseUrl} style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6, marginLeft: 8, backgroundColor: theme.colors.error }}>
            <Text style={{ color: theme.colors.white, fontWeight: '600' }}>Reset</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
          {/* Save button removed; autosave is enabled. Keeping container for spacing consistency. */}
        </View>
      </ScrollView>
    </View>
  );
}


