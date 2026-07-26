/**
 * Fixture mode: runs the whole UI without a backend or credentials.
 *
 * This exists so the app's design can be reviewed against realistic content --
 * full grids, long titles, wide/tall photos, busy and empty states -- instead of
 * the empty states you get when you cannot log in. Every screen is reachable and
 * screenshottable with `EXPO_PUBLIC_DEMO=1 npx expo start --web`.
 *
 * It is inert unless that flag is set, so nothing here reaches a release build's
 * behaviour; the branch in `client.ts` is a single early return.
 */
import type {
  HighlightDefinition,
  ImageItem,
  Person,
  SavedHighlight,
  ShareLink,
} from './types';

export const DEMO = process.env.EXPO_PUBLIC_DEMO === '1';

/** Stable pseudo-random so a given token always yields the same photo. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Real photographs matter here: gradients would hide exactly the problems this
 * mode is meant to expose (text contrast over a bright sky, faces cropped by a
 * collage tile, a scrim sitting on a busy horizon).
 */
export function demoPhotoUrl(path: string, size = 'w'): string {
  const seed = hash(path) % 900;
  const [w, h] = size === 'thumb' ? [400, 400] : [900, 1200];
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

const TITLES = [
  'Summer in Portugal',
  'Kristina & Felix',
  'Weekend in the Alps',
  'Golden hour',
  'Birthdays',
  'Rainy Amsterdam',
  'The long drive home',
  'Everything blue',
  'Christmas 2024',
  'Faces',
];

function tokensFor(id: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => `${id}-t${i}`);
}

function makeHighlight(i: number): SavedHighlight {
  const id = `demo-${i}`;
  // Deliberately uneven: a one-photo highlight and an unresolved one are the
  // layouts most likely to break, so they must be present by default.
  const count = i === 3 ? 1 : i === 7 ? 0 : 6 + ((i * 5) % 40);
  const tokens = tokensFor(id, Math.min(count, 4));
  return {
    id,
    title: TITLES[i % TITLES.length],
    icon: 'sparkles',
    itemCount: count,
    coverToken: tokens[0] ?? null,
    coverThumbnailUrl: tokens[0] ? `/media/${tokens[0]}/thumbnail` : null,
    previewTokens: tokens,
    previewThumbnailUrls: tokens.map((t) => `/media/${t}/thumbnail`),
    definition: {} as HighlightDefinition,
    updatedAtUs: Date.now() * 1000 - i * 86_400_000_000,
  } as SavedHighlight;
}

const HIGHLIGHTS: SavedHighlight[] = Array.from({ length: 10 }, (_, i) => makeHighlight(i));

function makeItem(id: string, i: number): ImageItem {
  const token = `${token_(id, i)}`;
  return {
    id: `${token}-img`,
    enteFileId: 1000 + i,
    title: i % 4 === 0 ? null : `IMG_${1000 + i}.jpg`,
    album: 'Camera',
    mediaType: 'image/jpeg',
    fileSize: 2_400_000,
    creationTimeUs: Date.now() * 1000 - i * 3_600_000_000,
    modificationTimeUs: null,
    latitude: null,
    longitude: null,
    hash: null,
    width: 3024,
    height: 4032,
    people: i % 3 === 0 ? ['Felix'] : i % 3 === 1 ? ['Kristina', 'Felix'] : [],
    faceCount: i % 3 === 0 ? 1 : 2,
    qualityScore: 0.8,
    highlightScore: 0.7,
    distinctAdded: null,
    rank: i,
    clusterId: i % 6 === 0 ? `cluster-${i}` : null,
    clusterSize: i % 6 === 0 ? 3 : 1,
    fullUrl: `/media/${token}/full`,
    thumbnailUrl: `/media/${token}/thumbnail`,
  };
}

function token_(id: string, i: number): string {
  return `${id}-t${i}`;
}

const PEOPLE: Person[] = ['Felix', 'Kristina', 'Mum', 'Dad', 'Ana', 'Jonas'].map((name, i) => ({
  name,
  count: 840 - i * 120,
  coverToken: `person-${i}`,
  coverThumbnailUrl: `/media/person-${i}/thumbnail`,
})) as unknown as Person[];

const shares = new Map<string, ShareLink[]>();

function makeShare(highlightId: string): ShareLink {
  const secret = `demo${Math.random().toString(36).slice(2, 10)}`;
  return {
    id: `share-${Math.random().toString(36).slice(2, 8)}`,
    highlightId,
    label: null,
    tokenPrefix: secret.slice(0, 6),
    allowDownload: true,
    expiresAt: null,
    revokedAt: null,
    viewCount: 0,
    lastViewedAt: null,
    createdAt: new Date().toISOString(),
    active: true,
    url: `/s/${secret}`,
    secret,
  } as unknown as ShareLink;
}

/** Latency is part of the design: instant responses hide every loading state. */
const delay = (ms = 260) => new Promise((r) => setTimeout(r, ms));

/**
 * Returns fixture data for a path, or `undefined` to let the real client run.
 * Kept as one function so `client.ts` needs exactly one branch.
 */
export async function demoRequest<T>(path: string, init?: RequestInit): Promise<T> {
  await delay();
  const method = (init?.method || 'GET').toUpperCase();
  const [clean] = path.split('?');

  if (clean === '/api/highlights/saved' && method === 'GET') {
    return { highlights: HIGHLIGHTS } as T;
  }
  if (clean === '/api/config') return { weights: {}, defaults: {} } as T;
  if (clean === '/api/quality-terms') return { terms: [] } as T;
  if (clean === '/api/people') return { people: PEOPLE } as T;
  if (clean === '/api/albums') return { albums: [] } as T;
  if (clean === '/api/sync/status') {
    return { state: 'idle', embeddedImages: 14471, totalImages: 14471, lastError: null } as T;
  }

  const items = clean.match(/^\/api\/highlights\/saved\/([^/]+)\/items$/);
  if (items) {
    const h = HIGHLIGHTS.find((x) => x.id === items[1]) ?? HIGHLIGHTS[0];
    const n = h.itemCount || 12;
    return {
      highlight: h,
      items: Array.from({ length: n }, (_, i) => makeItem(items[1], i)),
    } as T;
  }

  const shareMatch = clean.match(/^\/api\/highlights\/saved\/([^/]+)\/shares$/);
  if (shareMatch) {
    const id = shareMatch[1];
    if (method === 'POST') {
      const link = makeShare(id);
      shares.set(id, [...(shares.get(id) ?? []), link]);
      return link as T;
    }
    return { shares: shares.get(id) ?? [] } as T;
  }
  const revoke = clean.match(/^\/api\/highlights\/saved\/([^/]+)\/shares\/([^/]+)$/);
  if (revoke && method === 'DELETE') {
    shares.set(revoke[1], (shares.get(revoke[1]) ?? []).filter((s) => s.id !== revoke[2]));
    return undefined as T;
  }

  if (clean === '/api/highlights/preview' && method === 'POST') {
    return {
      items: Array.from({ length: 12 }, (_, i) => makeItem('preview', i)),
      candidateCount: 1420,
    } as T;
  }
  if (clean.startsWith('/api/highlights/saved') && method === 'DELETE') return undefined as T;
  if (clean.startsWith('/api/highlights/saved') && method === 'POST') {
    return HIGHLIGHTS[0] as T;
  }
  if (clean === '/api/sync/trigger' && method === 'POST') return { started: true } as T;

  return { items: [], highlights: [], people: [], terms: [] } as T;
}
