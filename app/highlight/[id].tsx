import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api } from '@/api/client';
import type { ImageItem } from '@/api/types';
import { ImageViewer } from '@/components/ImageViewer';
import { Button } from '@/components/ui';
import { colors, spacing, typography } from '@/theme';

export default function HighlightGallery() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const query = useQuery({ queryKey: ['saved-items', id], queryFn: () => api.savedItems(id) });
  const items = useMemo<ImageItem[]>(() => query.data?.items ?? [], [query.data]);
  const title = query.data?.highlight.title ?? 'Highlight';

  if (query.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary2} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>This highlight has no photos.</Text>
        <Button label="Back" icon="arrow-back" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <ImageViewer
      items={items}
      index={0}
      visible
      albumTitle={title}
      onClose={() => router.back()}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(4),
    padding: spacing(6),
  },
  empty: { ...typography.body, color: colors.textDim, textAlign: 'center' },
});
