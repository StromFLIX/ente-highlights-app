import 'react-native-gesture-handler';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { startOnlineManager } from '@/lib/offline';
import { persistOptions, queryClient } from '@/lib/query';
import { useAuth } from '@/state/auth';
import { colors } from '@/theme';

// Hold the native splash until auth + the persisted cache are restored, so the
// first frame the user sees is real content rather than an empty screen.
SplashScreen.preventAutoHideAsync().catch(() => {});
startOnlineManager();

function useAuthRedirect(ready: boolean, isAuthed: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === 'login';
    if (!isAuthed && !inAuth) router.replace('/login');
    else if (isAuthed && inAuth) router.replace('/');
  }, [ready, isAuthed, segments, router]);
}

function Root({ cacheRestored }: { cacheRestored: boolean }) {
  const ready = useAuth((s) => s.ready);
  const isAuthed = useAuth((s) => s.isAuthed);
  const hydrate = useAuth((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useAuthRedirect(ready, isAuthed);

  const booted = ready && cacheRestored;

  const onLayout = useCallback(() => {
    if (booted) SplashScreen.hideAsync().catch(() => {});
  }, [booted]);

  // Keep the splash up rather than flashing an empty screen.
  if (!booted) return <View style={styles.root} onLayout={onLayout} />;

  return (
    <View style={styles.root} onLayout={onLayout}>
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen
          name="create"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="login" />
        <Stack.Screen
          name="highlight/[id]"
          options={{ presentation: 'fullScreenModal', animation: 'fade' }}
        />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [cacheRestored, setCacheRestored] = useState(false);

  // Never let cache restoration be the reason the app sits on a splash screen.
  useEffect(() => {
    const t = setTimeout(() => setCacheRestored(true), 3_000);
    return () => clearTimeout(t);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={persistOptions}
          onSuccess={() => setCacheRestored(true)}
          onError={() => setCacheRestored(true)}
        >
          <StatusBar style="light" />
          <ErrorBoundary>
            <Root cacheRestored={cacheRestored} />
          </ErrorBoundary>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
