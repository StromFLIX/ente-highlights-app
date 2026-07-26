import { useCallback, useState } from 'react';
import { Alert, Share } from 'react-native';
import { absoluteUrl, api, errorMessage } from '@/api/client';
import type { SavedHighlight } from '@/api/types';
import { downloadPack } from '@/lib/download';

export type PackProgress = { id: string; done: number; total: number } | null;

/**
 * Album-level actions: create a share link, or save every photo to the gallery.
 *
 * Both are slow enough to need feedback, and both are easy to fire twice by
 * accident from a long-press menu, so the in-flight highlight id is tracked
 * here rather than in each screen.
 */
export function useAlbumActions() {
  const [pack, setPack] = useState<PackProgress>(null);
  const [sharing, setSharing] = useState<string | null>(null);

  const shareAlbum = useCallback(
    async (h: SavedHighlight) => {
      if (sharing) return;
      setSharing(h.id);
      try {
        // Reuse a live link if one exists, so repeatedly tapping Share doesn't
        // mint a pile of separate credentials that all have to be revoked.
        const existing = await api.shareList(h.id);
        const live = existing.find((s) => s.active);
        const link = live ?? (await api.shareCreate(h.id));

        // A reused link's secret is unrecoverable by design, so it can only be
        // re-shared if we just created it.
        if (!link.url) {
          Alert.alert(
            'Link already exists',
            'This album has an active link, but the URL is only shown once when ' +
              'it is created. Revoke it in the album menu to issue a new one.',
          );
          return;
        }

        const url = absoluteUrl(link.url);
        await Share.share({ message: url, url });
      } catch (e) {
        Alert.alert('Could not create link', errorMessage(e));
      } finally {
        setSharing(null);
      }
    },
    [sharing],
  );

  const savePack = useCallback(
    async (h: SavedHighlight) => {
      if (pack) return;
      setPack({ id: h.id, done: 0, total: h.itemCount || 0 });
      try {
        const { items } = await api.savedItems(h.id);
        if (items.length === 0) {
          Alert.alert('Nothing to save', 'This album has no photos.');
          return;
        }
        const res = await downloadPack(h.title, items, (done, total) =>
          setPack({ id: h.id, done, total }),
        );
        Alert.alert(
          'Saved',
          res.saved === res.total
            ? `${res.saved} photos saved to "${h.title}".`
            : `${res.saved} of ${res.total} saved to "${h.title}". Some photos could not be downloaded.`,
        );
      } catch (e) {
        Alert.alert('Download failed', errorMessage(e));
      } finally {
        setPack(null);
      }
    },
    [pack],
  );

  const revokeLinks = useCallback(async (h: SavedHighlight) => {
    try {
      const links = await api.shareList(h.id);
      const live = links.filter((s) => s.active);
      if (live.length === 0) {
        Alert.alert('No active links', 'This album is not shared.');
        return;
      }
      await Promise.all(live.map((s) => api.shareRevoke(h.id, s.id)));
      Alert.alert(
        'Sharing stopped',
        `${live.length} link${live.length === 1 ? '' : 's'} revoked. Anyone holding one now sees "not found".`,
      );
    } catch (e) {
      Alert.alert('Could not revoke', errorMessage(e));
    }
  }, []);

  return { pack, sharing, shareAlbum, savePack, revokeLinks };
}
