import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@/api/client';
import type { ImageItem } from '@/api/types';
import { saveOne, shareOne, downloadPack } from '@/lib/download';
import { colors, spacing, typography } from '@/theme';
import { ZoomableImage } from './ZoomableImage';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type Props = {
  items: ImageItem[];
  index: number;
  visible: boolean;
  onClose: () => void;
  onIndexChange?: (i: number) => void;
  onEndReached?: () => void;
  allowStack?: boolean;
  /** When set, shows a "download all" action that saves every item to a named album. */
  albumTitle?: string;
};

export function ImageViewer({
  items,
  index,
  visible,
  onClose,
  onIndexChange,
  onEndReached,
  allowStack = true,
  albumTitle,
}: Props) {
  const listRef = useRef<FlatList<ImageItem>>(null);
  const [i, setI] = useState(index);
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);
  const [dlAll, setDlAll] = useState<{ done: number; total: number } | null>(null);
  const [stackId, setStackId] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);
  // Where the timeline pager sat before opening a stack, to restore on exit.
  const savedIndexRef = useRef(index);

  // Sync to the tapped photo whenever the viewer (re)opens.
  useEffect(() => {
    if (!visible) return;
    setStackId(null);
    setZoomed(false);
    setI(index);
    savedIndexRef.current = index;
  }, [index, visible]);

  const stack = useQuery({
    queryKey: ['cluster', stackId],
    queryFn: () => api.cluster(stackId as string),
    enabled: !!stackId,
  });

  const inStack = !!stackId && (stack.data?.items?.length ?? 0) > 0;
  const data = inStack ? (stack.data?.items ?? []) : items;
  const current = data[Math.min(i, Math.max(0, data.length - 1))];
  const stacked = !!current && (current.clusterSize ?? 1) > 1;

  // Remount the list (and re-honor initialScrollIndex) when the source changes.
  const listKey = inStack ? `stack-${stackId}` : `base-${index}`;
  const startIndex = inStack ? 0 : index;

  const getItemLayout = useCallback(
    (_: ArrayLike<ImageItem> | null | undefined, idx: number) => ({
      length: SCREEN_W,
      offset: SCREEN_W * idx,
      index: idx,
    }),
    [],
  );

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const p = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
      if (p === i) return;
      setI(p);
      if (!inStack) {
        onIndexChange?.(p);
        if (p >= data.length - 3) onEndReached?.();
      }
    },
    [i, inStack, data.length, onIndexChange, onEndReached],
  );

  const enterStack = useCallback(() => {
    if (!current?.clusterId) return;
    savedIndexRef.current = i;
    setZoomed(false);
    setI(0);
    setStackId(current.clusterId);
  }, [current, i]);

  const exitStack = useCallback(() => {
    setZoomed(false);
    setStackId(null);
    setI(savedIndexRef.current);
  }, []);

  async function doShare() {
    if (!current) return;
    setBusy('share');
    try {
      await shareOne(current);
    } catch (e) {
      Alert.alert('Share failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(null);
    }
  }

  async function doSave() {
    if (!current) return;
    setBusy('save');
    try {
      await saveOne(current);
      Alert.alert('Saved', 'Photo saved to your gallery.');
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(null);
    }
  }

  async function doDownloadAll() {
    if (!albumTitle || dlAll || items.length === 0) return;
    setDlAll({ done: 0, total: items.length });
    try {
      const res = await downloadPack(albumTitle, items, (done, total) =>
        setDlAll({ done, total }),
      );
      Alert.alert('Saved', `${res.saved} photos saved to “${albumTitle}”.`);
    } catch (e) {
      Alert.alert('Download failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setDlAll(null);
    }
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.root}>
        <FlatList
          key={listKey}
          ref={listRef}
          data={data}
          keyExtractor={(it) => it.id}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={startIndex}
          getItemLayout={getItemLayout}
          windowSize={3}
          maxToRenderPerBatch={3}
          scrollEventThrottle={32}
          onScroll={onMomentumEnd}
          onMomentumScrollEnd={onMomentumEnd}
          onScrollToIndexFailed={({ index: ix }) => {
            setTimeout(() => {
              listRef.current?.scrollToOffset({ offset: ix * SCREEN_W, animated: false });
            }, 50);
          }}
          renderItem={({ item }) => (
            <View style={styles.page}>
              <ZoomableImage
                path={item.fullUrl}
                placeholderPath={item.thumbnailUrl}
                onZoomChange={setZoomed}
              />
            </View>
          )}
        />

        <SafeAreaView style={styles.topBar} pointerEvents="box-none" edges={['top']}>
          <Pressable style={styles.iconBtn} hitSlop={10} onPress={inStack ? exitStack : onClose}>
            <Ionicons name={inStack ? 'arrow-back' : 'close'} size={26} color="#fff" />
          </Pressable>
          <View style={styles.topRight}>
            {allowStack && !inStack && stacked ? (
              <Pressable style={styles.iconBtn} hitSlop={10} onPress={enterStack}>
                <Ionicons name="layers-outline" size={24} color="#fff" />
                <Text style={styles.badge}>{current?.clusterSize}</Text>
              </Pressable>
            ) : null}
            {albumTitle && !inStack ? (
              <Pressable
                style={styles.iconBtn}
                hitSlop={10}
                onPress={doDownloadAll}
                disabled={!!dlAll}
              >
                {dlAll ? (
                  <Text style={styles.dlText}>
                    {dlAll.done}/{dlAll.total}
                  </Text>
                ) : (
                  <Ionicons name="albums-outline" size={23} color="#fff" />
                )}
              </Pressable>
            ) : null}
            <Pressable style={styles.iconBtn} hitSlop={10} onPress={doShare} disabled={!!busy}>
              {busy === 'share' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="share-social-outline" size={24} color="#fff" />
              )}
            </Pressable>
            <Pressable style={styles.iconBtn} hitSlop={10} onPress={doSave} disabled={!!busy}>
              {busy === 'save' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="download-outline" size={24} color="#fff" />
              )}
            </Pressable>
          </View>
        </SafeAreaView>

        {current ? (
          <SafeAreaView style={styles.bottom} pointerEvents="none" edges={['bottom']}>
            <Text style={styles.caption} numberOfLines={1}>
              {inStack ? 'Stack' : (current.title ?? '')}
            </Text>
            <Text style={styles.sub}>
              {i + 1} / {data.length}
              {!inStack && current.album ? ` · ${current.album}` : ''}
            </Text>
          </SafeAreaView>
        ) : null}

        {stackId && stack.isLoading ? (
          <View style={styles.stackLoading} pointerEvents="none">
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  page: { width: SCREEN_W, height: SCREEN_H },
  topBar: {
    position: 'absolute',
    top: 0,
    left: spacing(3),
    right: spacing(3),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  iconBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  dlText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  badge: { position: 'absolute', top: 4, right: 2, color: '#fff', fontSize: 10, fontWeight: '800' },
  bottom: { position: 'absolute', bottom: 0, left: spacing(5), right: spacing(5), paddingBottom: spacing(3) },
  caption: { ...typography.title, color: '#fff' },
  sub: { ...typography.caption, color: 'rgba(255,255,255,0.7)' },
  stackLoading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
