import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Field } from '@/components/ui';
import { TwoFactorError, useAuth } from '@/state/auth';
import { colors, radius, spacing, typography } from '@/theme';

export default function Login() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const baseUrl = useAuth((s) => s.baseUrl);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password, needs2fa ? totp.trim() : undefined);
      router.replace('/');
    } catch (e) {
      if (e instanceof TwoFactorError) {
        setNeeds2fa(true);
        setError('Enter your 2FA code');
      } else {
        setError(e instanceof Error ? e.message : 'Login failed');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <View style={styles.logo}>
            <Ionicons name="sparkles" size={30} color={colors.text} />
          </View>
          <Text style={typography.h1}>Ente Highlights</Text>
          <Text style={[typography.body, { color: colors.textDim }]}>
            Sign in with your Ente account
          </Text>
        </View>

        <View style={styles.form}>
          <Field
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          {needs2fa ? (
            <Field
              placeholder="2FA code"
              value={totp}
              onChangeText={setTotp}
              keyboardType="numeric"
            />
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button label="Sign in" onPress={onSubmit} loading={busy} icon="log-in-outline" />
        </View>

        <Pressable style={styles.footer} onPress={() => router.push('/settings')}>
          <Ionicons name="server-outline" size={14} color={colors.textFaint} />
          <Text style={styles.footerText}>{baseUrl}</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing(6) },
  header: { alignItems: 'center', marginBottom: spacing(10), gap: spacing(2) },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(2),
  },
  form: { gap: spacing(3) },
  error: { ...typography.label, color: colors.warning },
  footer: {
    flexDirection: 'row',
    gap: spacing(1.5),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing(8),
  },
  footerText: { ...typography.caption },
});
