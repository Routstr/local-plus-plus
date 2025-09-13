import { loadRoutstrBaseUrl, saveRoutstrModelsCache, loadRoutstrModelsCache } from '../utils/storage';
import type { RoutstrModel } from '../types/routstr';

export async function fetchRoutstrModelsFromApi(): Promise<RoutstrModel[]> {
  const baseUrl = await loadRoutstrBaseUrl();
  const res = await fetch(`${baseUrl}/v1/models`);
  const json = await res.json();
  const items = Array.isArray(json?.data) ? json.data : [];
  return items as RoutstrModel[];
}

export async function refreshAndCacheRoutstrModels(): Promise<Array<{ id: string; name: string; maxCost: number; completionSatPerToken?: number }>> {
  const items = await fetchRoutstrModelsFromApi();
  const mapped = items
    .map((m) => ({
      id: String(m.id || ''),
      name: String(m.name || m.id || 'Unknown Model'),
      maxCost: Number(m?.pricing?.max_cost ?? m?.sats_pricing?.max_cost ?? 0),
      completionSatPerToken: Number(m?.sats_pricing?.completion ?? NaN),
    }))
    .filter((m) => !!m.id);
  await saveRoutstrModelsCache(mapped);
  return mapped;
}

export async function getCachedRoutstrModelsLight(): Promise<Array<{ id: string; name: string; completionSatPerToken?: number }>> {
  const cached = await loadRoutstrModelsCache();
  return cached.map((m) => ({ id: m.id, name: m.name, completionSatPerToken: m.completionSatPerToken }));
}


