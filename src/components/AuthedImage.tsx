import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageContentFit } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { mediaSource } from '@/api/client';
import { useAuth } from '@/state/auth';
import { colors } from '@/theme';

const blurhash = 'L6Pj0^jE.AyE_3t7t7R**0o#DgR4';
/**
 * Thumbnails are ~30 KB, so retrying one is cheap and usually fixes a blip.
 * A full-size original is megabytes: remounting mid-download throws away all
 * progress *and* leaves the abandoned request running server-side, so eager
 * retries actively make a slow photo slower. Retry those once, then let the
 * user decide.
 */
const RETRIES_THUMBNAIL = 4;
const RETRIES_FULL = 1;

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
  // Media URLs carry the bearer token, so a silent relogin must re-issue them.
  const token = useAuth((s) => s.token);

  const maxRetry = useMemo(
    () => (path.endsWith('/full') ? RETRIES_FULL : RETRIES_THUMBNAIL),
    [path],
  );

  // Auto-retry transient failures with a small backoff so images don't stay blank.
  useEffect(() => {
    if (status === 'error' && attempt < maxRetry) {
      timer.current = setTimeout(() => setAttempt((a) => a + 1), 700 * (attempt + 1));
      return () => {
        if (timer.current) clearTimeout(timer.current);
      };
    }
  }, [status, attempt, maxRetry]);

  // Reset when the underlying image changes (e.g. a recycled SectionList cell),
  // so a previously errored/loaded cell reloads the new thumbnail instead of
  // staying blank until tapped. A new token has the same effect.
  useEffect(() => {
    setAttempt(0);
    setStatus('loading');
  }, [path, token]);

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
      {status === 'error' && attempt >= maxRetry ? (
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
