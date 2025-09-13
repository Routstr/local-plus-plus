import { loadRoutstrBaseUrl, loadRoutstrToken } from '../utils/storage';

export interface RoutstrWalletInfo {
  api_key: string
  balance: number
}

export async function fetchRoutstrWalletInfo(explicitApiKey?: string): Promise<RoutstrWalletInfo> {
  const baseUrl = await loadRoutstrBaseUrl();
  const apiKey = explicitApiKey ?? (await loadRoutstrToken()) ?? '';
  if (!apiKey) {throw new Error('Missing Routstr API key');}
  const res = await fetch(`${baseUrl}/v1/balance/info`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  });
  if (!res.ok) {throw new Error(`Balance fetch failed: ${res.status}`);}
  const json = await res.json();
  return { api_key: String(json?.api_key ?? ''), balance: Number(json?.balance ?? 0) };
}

export async function topupRoutstrWallet(cashuToken: string, explicitApiKey?: string): Promise<number> {
  const baseUrl = await loadRoutstrBaseUrl();
  const apiKey = explicitApiKey ?? (await loadRoutstrToken()) ?? '';
  if (!apiKey) {throw new Error('Missing Routstr API key');}
  if (!cashuToken.trim()) {throw new Error('Missing Cashu token');}
  const res = await fetch(`${baseUrl}/v1/balance/topup`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ cashu_token: cashuToken.trim() }),
  });
  if (!res.ok) {
    let detail = `Topup failed: ${res.status}`;
    try { const err = await res.json(); if (err?.detail) { detail = String(err.detail); } } catch {}
    throw new Error(detail);
  }
  const json = await res.json();
  return Math.max(0, Math.round(Number(json?.msats ?? 0)));
}

export type RefundResult = {
  token?: string
  recipient?: string
  msats?: number
  sats?: number
}

export async function refundRoutstrWallet(explicitApiKey?: string): Promise<RefundResult> {
  const baseUrl = await loadRoutstrBaseUrl();
  const apiKey = explicitApiKey ?? (await loadRoutstrToken()) ?? '';
  if (!apiKey) {throw new Error('Missing Routstr API key');}
  const res = await fetch(`${baseUrl}/v1/balance/refund`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  });
  if (!res.ok) {
    let detail = `Refund failed: ${res.status}`;
    try { const err = await res.json(); if (err?.detail) { detail = String(err.detail); } } catch {}
    throw new Error(detail);
  }
  const json = await res.json();
  return {
    token: typeof json?.token === 'string' ? json.token : undefined,
    recipient: typeof json?.recipient === 'string' ? json.recipient : undefined,
    msats: json?.msats != null ? Number(json.msats) : undefined,
    sats: json?.sats != null ? Number(json.sats) : undefined,
  };
}


