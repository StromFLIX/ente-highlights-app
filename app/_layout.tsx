import 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '@/state/auth';
import { colors } from '@/theme';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } },
});

function AuthGate() {
  const ready = useAuth((s) => s.ready);
  const isAuthed = useAuth((s) => s.isAuthed);
  const hydrate = useAuth((s) => s.hydrate);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === 'login';
    if (!isAuthed && !inAuth) router.replace('/login');
    else if (isAuthed && inAuth) router.replace('/');
  }, [ready, isAuthed, segments, router]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <AuthGate />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="create" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="login" />
            <Stack.Screen
              name="highlight/[id]"
              options={{ presentation: 'fullScreenModal', animation: 'fade' }}
            />
            <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
