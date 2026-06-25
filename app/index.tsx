import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
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
import { api } from '@/api/client';
import type { SavedHighlight } from '@/api/types';
import { AuthedImage } from '@/components/AuthedImage';
import { Empty } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme';

const COLS = 2;
const GAP = spacing(3);
const PAD = spacing(4);
const CARD_W = (Dimensions.get('window').width - PAD * 2 - GAP) / COLS;
const CARD_H = Math.round(CARD_W * 1.3);

export default function Home() {
  const router = useRouter();
  const qc = useQueryClient();

  const saved = useQuery({ queryKey: ['saved'], queryFn: api.savedList });
  const sync = useQuery({ queryKey: ['sync'], queryFn: api.syncStatus });

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

  const renderCard = useCallback(
    ({ item: h }: { item: SavedHighlight }) => (
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/highlight/${h.id}`)}
        onLongPress={() => confirmDelete(h)}
        delayLongPress={350}
      >
        {h.coverThumbnailUrl ? (
          <AuthedImage path={h.coverThumbnailUrl} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverEmpty]}>
            <Ionicons name="sparkles" size={28} color={colors.textFaint} />
          </View>
        )}
        <View style={styles.scrim} />
        {h.itemCount ? (
          <View style={styles.countPill}>
            <Ionicons name="images" size={11} color="#fff" />
            <Text style={styles.countText}>{h.itemCount}</Text>
          </View>
        ) : null}
        <View style={styles.meta}>
          {h.icon ? <Ionicons name={h.icon as any} size={15} color="#fff" /> : null}
          <Text style={styles.cardTitle} numberOfLines={2}>
            {h.title}
          </Text>
        </View>
      </Pressable>
    ),
    [router, confirmDelete],
  );

  const list = saved.data ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={typography.h1}>Highlights</Text>
          {sync.data ? (
            <Text style={styles.sub}>
              {sync.data.embeddedImages}/{sync.data.totalImages} photos · {sync.data.state}
            </Text>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.iconBtn}
            onPress={() =>
              api
                .syncTrigger()
                .then(() => {
                  sync.refetch();
                  Alert.alert('Sync started', 'New photos are being fetched and analysed.');
                })
                .catch(() => Alert.alert('Sync unavailable', 'Could not reach the sync service.'))
            }
          >
            <Ionicons name="sync" size={18} color={colors.text} />
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
          saved.isLoading ? null : (
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
  sub: { ...typography.caption, marginTop: 2 },
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  cover: { ...StyleSheet.absoluteFillObject },
  coverEmpty: { alignItems: 'center', justifyContent: 'center' },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 96,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  countPill: {
    position: 'absolute',
    top: spacing(2),
    right: spacing(2),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.overlay,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(2),
    paddingVertical: 3,
  },
  countText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  meta: {
    position: 'absolute',
    left: spacing(3),
    right: spacing(3),
    bottom: spacing(3),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
  },
  cardTitle: { ...typography.title, color: '#fff', flex: 1, fontSize: 15 },
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
