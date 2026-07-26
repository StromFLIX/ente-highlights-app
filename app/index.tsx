import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, errorMessage } from '@/api/client';
import type { SavedHighlight } from '@/api/types';
import { BottomSheet, type SheetAction } from '@/components/BottomSheet';
import { CollageCover } from '@/components/CollageCover';
import { Empty, ErrorState, Loading } from '@/components/ui';
import { useAlbumActions } from '@/hooks/useAlbumActions';
import { useAuth } from '@/state/auth';
import { colors, radius, spacing, typography } from '@/theme';

const COLS = 2;
const GAP = spacing(3);
const PAD = spacing(4);
const CARD_W = (Dimensions.get('window').width - PAD * 2 - GAP) / COLS;
const CARD_H = Math.round(CARD_W * 1.3);

export default function Home() {
  const router = useRouter();
  const qc = useQueryClient();
  const isAuthed = useAuth((s) => s.isAuthed);
  const { pack, shareAlbum, savePack, revokeLinks } = useAlbumActions();

  const saved = useQuery({ queryKey: ['saved'], queryFn: api.savedList, enabled: isAuthed });
  const sync = useQuery({
    queryKey: ['sync'],
    queryFn: api.syncStatus,
    enabled: isAuthed,
    // Poll while the server is still ingesting so progress actually moves.
    refetchInterval: (q) => (q.state.data?.state === 'syncing' ? 5_000 : false),
  });

  const onRefresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['saved'] });
    sync.refetch();
  }, [qc, sync]);

  const confirmDelete = useCallback(
    (h: SavedHighlight) => {
      Alert.alert(h.title, 'Delete this highlight?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            api
              .savedDelete(h.id)
              .then(() => qc.invalidateQueries({ queryKey: ['saved'] }))
              .catch(() => Alert.alert('Could not delete', 'Please try again.')),
        },
      ]);
    },
    [qc],
  );

  // Long-press used to delete outright, which made destruction the only hidden
  // action and left sharing/saving undiscoverable.
  const [menuFor, setMenuFor] = useState<SavedHighlight | null>(null);

  const menuActions = useMemo((): SheetAction[] => {
    const h = menuFor;
    if (!h) return [];
    return [
      {
        label: 'Share link',
        icon: 'link-outline',
        detail: 'Anyone with the link can view this album',
        onPress: () => shareAlbum(h),
      },
      {
        label: 'Save all to gallery',
        icon: 'download-outline',
        detail: h.itemCount
          ? `${h.itemCount} ${h.itemCount === 1 ? 'photo' : 'photos'} to your camera roll`
          : undefined,
        onPress: () => savePack(h),
        disabled: !h.itemCount,
      },
      { label: 'Stop sharing', icon: 'unlink-outline', onPress: () => revokeLinks(h) },
      {
        label: 'Delete album',
        icon: 'trash-outline',
        destructive: true,
        onPress: () => confirmDelete(h),
      },
    ];
  }, [menuFor, shareAlbum, savePack, revokeLinks, confirmDelete]);

  const renderCard = useCallback(
    ({ item: h }: { item: SavedHighlight }) => {
      // Persisted query cache can predate the preview field, so never assume it.
      const previews = h.previewThumbnailUrls?.length
        ? h.previewThumbnailUrls
        : h.coverThumbnailUrl
          ? [h.coverThumbnailUrl]
          : [];
      const busy = pack?.id === h.id ? pack : null;
      return (
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => router.push(`/highlight/${h.id}`)}
          onLongPress={() => setMenuFor(h)}
          delayLongPress={350}
        >
          {previews.length ? (
            <CollageCover paths={previews} seed={h.id} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverEmpty]}>
              <Ionicons name="sparkles" size={28} color={colors.textFaint} />
            </View>
          )}
          {/* A gradient, not a slab: a flat scrim leaves a hard seam straight
              across the photo, which is the single most dated thing on a cover. */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.78)']}
            locations={[0, 0.45, 1]}
            style={styles.scrim}
            pointerEvents="none"
          />
          {busy ? (
            <View style={styles.busy}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.busyText}>
                {busy.done}/{busy.total}
              </Text>
            </View>
          ) : null}
          {/* Every other action was behind a long-press, which is invisible.
              This makes the menu discoverable without a second tap target on
              the card body. */}
          <Pressable
            style={styles.more}
            onPress={() => setMenuFor(h)}
            hitSlop={8}
            accessibilityLabel={`Actions for ${h.title}`}
          >
            <Ionicons name="ellipsis-horizontal" size={16} color="#fff" />
          </Pressable>
          <View style={styles.meta}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {h.title}
            </Text>
            <Text style={styles.cardSub} numberOfLines={1}>
              {h.itemCount
                ? `${h.itemCount} ${h.itemCount === 1 ? 'photo' : 'photos'}`
                : 'Not resolved yet'}
            </Text>
          </View>
        </Pressable>
      );
    },
    [router, pack],
  );

  const list = saved.data ?? [];
  const syncing = sync.data?.state === 'syncing';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Text style={typography.h1}>Highlights</Text>
          {sync.data ? (
            <View style={styles.syncRow}>
              {syncing ? <ActivityIndicator size="small" color={colors.primary2} /> : null}
              <Text style={styles.sub}>
                {sync.data.state === 'error'
                  ? `Sync failed: ${sync.data.lastError ?? 'unknown error'}`
                  : `${sync.data.embeddedImages}/${sync.data.totalImages} photos analysed${
                      syncing ? ' · syncing…' : ''
                    }`}
              </Text>
            </View>
          ) : sync.isLoading ? (
            <Text style={styles.sub}>Checking your library…</Text>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.iconBtn}
            disabled={syncing}
            onPress={() =>
              api
                .syncTrigger()
                .then(() => {
                  sync.refetch();
                  Alert.alert('Sync started', 'New photos are being fetched and analysed.');
                })
                .catch((e) => Alert.alert('Sync unavailable', errorMessage(e)))
            }
          >
            <Ionicons name="sync" size={18} color={syncing ? colors.textFaint : colors.text} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={18} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={list}
        keyExtractor={(h) => h.id}
        renderItem={renderCard}
        numColumns={COLS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={saved.isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.primary2}
          />
        }
        ListEmptyComponent={
          saved.isLoading ? (
            <Loading label="Loading your highlights…" style={styles.stateBlock} />
          ) : saved.isError ? (
            <ErrorState
              message={errorMessage(saved.error)}
              onRetry={() => saved.refetch()}
              retrying={saved.isFetching}
              style={styles.stateBlock}
            />
          ) : (
            <View style={styles.emptyWrap}>
              <Empty icon="sparkles-outline" text="No highlights yet." />
              <Text style={styles.emptyHint}>
                Tap the button below to curate your best photos by person, month, or theme.
              </Text>
            </View>
          )
        }
      />

      <Pressable style={styles.fab} onPress={() => router.push('/create')}>
        <Ionicons name="add" size={22} color={colors.text} />
        <Text style={styles.fabText}>Create</Text>
      </Pressable>

      <BottomSheet
        visible={!!menuFor}
        title={menuFor?.title}
        subtitle={
          menuFor?.itemCount
            ? `${menuFor.itemCount} ${menuFor.itemCount === 1 ? 'photo' : 'photos'}`
            : undefined
        }
        actions={menuActions}
        onClose={() => setMenuFor(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
    paddingBottom: spacing(2),
  },
  sub: { ...typography.caption, marginTop: 2, flexShrink: 1 },
  headerTitle: { flex: 1, paddingRight: spacing(2) },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) },
  stateBlock: { marginTop: spacing(16) },
  headerActions: { flexDirection: 'row', gap: spacing(2) },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: { padding: PAD, paddingBottom: spacing(28), gap: GAP },
  row: { gap: GAP },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
  },
  cardPressed: { opacity: 0.85 },
  cover: { ...StyleSheet.absoluteFillObject },
  coverEmpty: { alignItems: 'center', justifyContent: 'center' },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // Tall and soft: the fade has to start well above the text or the ramp
    // itself becomes a visible band.
    height: '62%',
  },
  more: {
    position: 'absolute',
    top: spacing(1.5),
    right: spacing(1.5),
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  busy: {
    position: 'absolute',
    top: spacing(2),
    left: spacing(2),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    backgroundColor: colors.overlay,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(2.5),
    paddingVertical: 4,
  },
  busyText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  meta: {
    position: 'absolute',
    left: spacing(3),
    right: spacing(3),
    bottom: spacing(3),
  },
  // One line, always. Two-line titles made neighbouring cards disagree about
  // where their text sat, which read as misalignment rather than variety.
  cardTitle: { ...typography.title, color: '#fff', fontSize: 15 },
  cardSub: { ...typography.caption, color: 'rgba(255,255,255,0.72)', marginTop: 1 },
  emptyWrap: { marginTop: spacing(16), alignItems: 'center' },
  emptyHint: {
    ...typography.body,
    color: colors.textFaint,
    textAlign: 'center',
    paddingHorizontal: spacing(10),
    marginTop: spacing(1),
  },
  fab: {
    position: 'absolute',
    bottom: spacing(6),
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing(3.5),
    paddingHorizontal: spacing(6),
    shadowColor: colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { ...typography.title, fontSize: 15, color: colors.text },
});
