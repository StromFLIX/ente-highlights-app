import { useAuth } from '@/state/auth';
import { DEMO, demoPhotoUrl, demoRequest } from './demo';
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
  ShareLink,
  SyncStatus,
} from './types';

/** Normal API calls: fail fast so the UI never spins forever. */
const DEFAULT_TIMEOUT_MS = 15_000;
/** Plain DB aggregates that can still be slow on a cold pool or a big library. */
const MEDIUM_TIMEOUT_MS = 30_000;
/** Calls that legitimately do heavy server-side work (embedding + scoring). */
const LONG_TIMEOUT_MS = 90_000;

export type ApiErrorKind = 'timeout' | 'network' | 'auth' | 'http';

export class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

/** Short, user-facing text for any thrown error. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.kind) {
      case 'timeout':
        return 'The server took too long to respond.';
      case 'network':
        return `Can't reach ${base()}. Check your connection or the server URL in Settings.`;
      case 'auth':
        return 'Your session expired. Please sign in again.';
      default:
        return err.message || `Request failed (${err.status ?? '?'}).`;
    }
  }
  return err instanceof Error ? err.message : 'Something went wrong.';
}

function base(): string {
  return useAuth.getState().baseUrl.replace(/\/$/, '');
}

/** Absolute URL for a relative API path (e.g. an image's /media/... path). */
export function absoluteUrl(path: string): string {
  if (DEMO && path.startsWith('/media/')) {
    return demoPhotoUrl(path, path.endsWith('/thumbnail') ? 'thumb' : 'full');
  }
  if (/^https?:\/\//.test(path)) return path;
  return `${base()}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** expo-image source with the auth header attached. */
export function mediaSource(path: string) {
  // Fixture photos are public URLs; sending a fake bearer token would break them.
  if (DEMO) return { uri: absoluteUrl(path) };
  const token = useAuth.getState().token;
  return {
    uri: absoluteUrl(path),
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  };
}

type RequestOptions = { timeoutMs?: number; retry?: boolean };

async function request<T>(
  path: string,
  init?: RequestInit,
  { timeoutMs = DEFAULT_TIMEOUT_MS, retry = true }: RequestOptions = {},
): Promise<T> {
  if (DEMO) return demoRequest<T>(path, init);
  const token = useAuth.getState().token;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(absoluteUrl(path), {
      ...init,
      signal: controller.signal,
      headers: {
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {}),
      },
    });
  } catch (e) {
    // An abort here is always ours: the request outlived `timeoutMs`.
    if (controller.signal.aborted) {
      throw new ApiError('timeout', `Timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw new ApiError('network', e instanceof Error ? e.message : 'Network request failed');
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401 && retry) {
    const ok = await useAuth.getState().silentRelogin();
    if (ok) return request<T>(path, init, { timeoutMs, retry: false });
    throw new ApiError('auth', 'Session expired', 401);
  }
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.detail?.message || body?.message || JSON.stringify(body);
    } catch {
      detail = await res.text().catch(() => '');
    }
    throw new ApiError(
      res.status === 401 ? 'auth' : 'http',
      `${res.status} ${detail}`.trim(),
      res.status,
    );
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
    request<PreviewResponse>(
      '/api/highlights/preview',
      { method: 'POST', body: JSON.stringify(definition) },
      { timeoutMs: LONG_TIMEOUT_MS },
    ),

  savedList: () =>
    request<{ highlights: SavedHighlight[] }>('/api/highlights/saved').then((r) => r.highlights),
  savedCreate: (input: { title: string; icon?: string; definition: HighlightDefinition }) =>
    request<SavedHighlight>('/api/highlights/saved', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  savedItems: (id: string) =>
    request<SavedItemsResponse>(`/api/highlights/saved/${id}/items`, undefined, {
      timeoutMs: LONG_TIMEOUT_MS,
    }),
  savedDelete: (id: string) =>
    request<void>(`/api/highlights/saved/${id}`, { method: 'DELETE' }),

  shareList: (id: string) =>
    request<{ shares: ShareLink[] }>(`/api/highlights/saved/${id}/shares`).then(
      (r) => r.shares,
    ),
  // The secret is in this response and nowhere else -- the server only keeps a
  // hash, so a link that isn't captured here can never be recovered.
  shareCreate: (id: string, input?: { label?: string; allowDownload?: boolean }) =>
    request<ShareLink>(`/api/highlights/saved/${id}/shares`, {
      method: 'POST',
      body: JSON.stringify({ allowDownload: true, ...input }),
    }),
  shareRevoke: (id: string, linkId: string) =>
    request<void>(`/api/highlights/saved/${id}/shares/${linkId}`, { method: 'DELETE' }),

  people: () =>
    request<{ people: Person[] }>('/api/people', undefined, { timeoutMs: MEDIUM_TIMEOUT_MS }).then(
      (r) => r.people,
    ),
  albums: () => request<{ albums: Album[] }>('/api/albums').then((r) => r.albums),

  syncStatus: () => request<SyncStatus>('/api/sync/status'),
  syncTrigger: () => request<{ state: string }>('/api/sync/trigger', { method: 'POST' }),
};

export type { ImageItem };
