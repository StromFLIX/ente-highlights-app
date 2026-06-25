import { useAuth } from '@/state/auth';
import type {
  Album,
  HighlightDefinition,
  ImageItem,
  Person,
  PreviewResponse,
  QualityTermsResponse,
  SavedHighlight,
  SavedItemsResponse,
  ScoringConfig,
  SyncStatus,
} from './types';

function base(): string {
  return useAuth.getState().baseUrl.replace(/\/$/, '');
}

/** Absolute URL for a relative API path (e.g. an image's /media/... path). */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${base()}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** expo-image source with the auth header attached. */
export function mediaSource(path: string) {
  const token = useAuth.getState().token;
  return {
    uri: absoluteUrl(path),
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  };
}

async function request<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  const token = useAuth.getState().token;
  const res = await fetch(absoluteUrl(path), {
    ...init,
    headers: {
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });

  if (res.status === 401 && retry) {
    const ok = await useAuth.getState().silentRelogin();
    if (ok) return request<T>(path, init, false);
  }
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.detail?.message || body?.message || JSON.stringify(body);
    } catch {
      detail = await res.text().catch(() => '');
    }
    throw new Error(`${res.status} ${detail}`.trim());
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  config: () => request<ScoringConfig>('/api/config'),
  qualityTerms: () => request<QualityTermsResponse>('/api/quality-terms'),

  cluster: (clusterId: string) =>
    request<{ items: ImageItem[]; count: number }>(`/api/clusters/${clusterId}`),

  preview: (definition: HighlightDefinition) =>
    request<PreviewResponse>('/api/highlights/preview', {
      method: 'POST',
      body: JSON.stringify(definition),
    }),

  savedList: () =>
    request<{ highlights: SavedHighlight[] }>('/api/highlights/saved').then((r) => r.highlights),
  savedCreate: (input: { title: string; icon?: string; definition: HighlightDefinition }) =>
    request<SavedHighlight>('/api/highlights/saved', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  savedItems: (id: string) => request<SavedItemsResponse>(`/api/highlights/saved/${id}/items`),
  savedDelete: (id: string) =>
    request<void>(`/api/highlights/saved/${id}`, { method: 'DELETE' }),

  people: () => request<{ people: Person[] }>('/api/people').then((r) => r.people),
  albums: () => request<{ albums: Album[] }>('/api/albums').then((r) => r.albums),

  syncStatus: () => request<SyncStatus>('/api/sync/status'),
  syncTrigger: () => request<{ state: string }>('/api/sync/trigger', { method: 'POST' }),
};

export type { ImageItem };
