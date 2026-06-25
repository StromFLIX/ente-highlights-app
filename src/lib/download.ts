import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { absoluteUrl } from '@/api/client';
import type { ImageItem } from '@/api/types';
import { useAuth } from '@/state/auth';

export type DownloadResult = { saved: number; total: number };

function authHeaders(): Record<string, string> | undefined {
  const token = useAuth.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

/** Download one image's full-res bytes to the device cache and return the uri. */
async function downloadToCache(item: ImageItem, prefix = 'eh'): Promise<string> {
  const dest = `${FileSystem.cacheDirectory}${prefix}_${item.id}.jpg`;
  const dl = await FileSystem.downloadAsync(absoluteUrl(item.fullUrl), dest, {
    headers: authHeaders(),
  });
  return dl.uri;
}

/** Save a single image to the device gallery (camera roll). */
export async function saveOne(item: ImageItem): Promise<void> {
  const perm = await MediaLibrary.requestPermissionsAsync();
  if (!perm.granted) throw new Error('Gallery permission denied');
  const uri = await downloadToCache(item, 'save');
  await MediaLibrary.saveToLibraryAsync(uri);
  FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
}

/** Open the system share sheet for a single image. */
export async function shareOne(item: ImageItem): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available');
  const uri = await downloadToCache(item, 'share');
  await Sharing.shareAsync(uri, {
    mimeType: 'image/jpeg',
    dialogTitle: item.title ?? 'Share photo',
  });
}

/** Download every image's full-res bytes and save them to a named gallery album. */
export async function downloadPack(
  albumName: string,
  items: ImageItem[],
  onProgress?: (done: number, total: number) => void,
): Promise<DownloadResult> {
  const perm = await MediaLibrary.requestPermissionsAsync();
  if (!perm.granted) throw new Error('Gallery permission denied');

  const token = useAuth.getState().token;
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  let album: MediaLibrary.Album | null = null;
  let saved = 0;

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const dest = `${FileSystem.cacheDirectory}eh_${it.id}.jpg`;
    try {
      const dl = await FileSystem.downloadAsync(absoluteUrl(it.fullUrl), dest, { headers });
      const asset = await MediaLibrary.createAssetAsync(dl.uri);
      if (!album) {
        album = await MediaLibrary.getAlbumAsync(albumName);
        if (!album) {
          album = await MediaLibrary.createAlbumAsync(albumName, asset, false);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }
      saved += 1;
    } catch {
      // Skip a single failed image; keep going.
    } finally {
      onProgress?.(i + 1, items.length);
      FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
    }
  }
  return { saved, total: items.length };
}
