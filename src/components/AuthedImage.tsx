import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageContentFit } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { mediaSource } from '@/api/client';
import { colors } from '@/theme';

const blurhash = 'L6Pj0^jE.AyE_3t7t7R**0o#DgR4';
const MAX_AUTO_RETRY = 4;

type Props = {
  path: string;
  style?: ViewStyle;
  contentFit?: ImageContentFit;
  transition?: number;
  placeholderPath?: string; // e.g. a thumbnail shown behind a full image
  spinner?: boolean;
  onLoaded?: () => void;
};

export function AuthedImage({
  path,
  style,
  contentFit = 'cover',
  transition = 160,
  placeholderPath,
  spinner = true,
  onLoaded,
}: Props) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-retry transient failures with a small backoff so images don't stay blank.
  useEffect(() => {
    if (status === 'error' && attempt < MAX_AUTO_RETRY) {
      timer.current = setTimeout(() => setAttempt((a) => a + 1), 700 * (attempt + 1));
      return () => {
        if (timer.current) clearTimeout(timer.current);
      };
    }
  }, [status, attempt]);

  // Reset when the underlying image changes (e.g. a recycled SectionList cell),
  // so a previously errored/loaded cell reloads the new thumbnail instead of
  // staying blank until tapped.
  useEffect(() => {
    setAttempt(0);
    setStatus('loading');
  }, [path]);

  return (
    <View style={[styles.wrap, style]}>
      <Image
        key={attempt}
        source={mediaSource(path)}
        placeholder={placeholderPath ? mediaSource(placeholderPath) : { blurhash }}
        placeholderContentFit={placeholderPath ? contentFit : 'cover'}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        transition={transition}
        cachePolicy="memory-disk"
        recyclingKey={`${path}#${attempt}`}
        onLoadStart={() => setStatus('loading')}
        onLoad={() => {
          setStatus('loaded');
          onLoaded?.();
        }}
        onError={() => setStatus('error')}
      />
      {status === 'loading' && spinner ? (
        <View style={styles.center} pointerEvents="none">
          <ActivityIndicator size="small" color={colors.textFaint} />
        </View>
      ) : null}
      {status === 'error' && attempt >= MAX_AUTO_RETRY ? (
        <Pressable
          style={styles.center}
          onPress={() => {
            setStatus('loading');
            setAttempt((a) => a + 1);
          }}
        >
          <Ionicons name="refresh" size={20} color={colors.textDim} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.surface2, overflow: 'hidden' },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
