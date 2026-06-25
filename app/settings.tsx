import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Field, SectionHeader } from '@/components/ui';
import { useAuth } from '@/state/auth';
import { colors, spacing, typography } from '@/theme';

export default function Settings() {
  const router = useRouter();
  const baseUrl = useAuth((s) => s.baseUrl);
  const email = useAuth((s) => s.email);
  const setBaseUrl = useAuth((s) => s.setBaseUrl);
  const logout = useAuth((s) => s.logout);

  const [url, setUrl] = useState(baseUrl);
  const [saved, setSaved] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={typography.h1}>Settings</Text>
        <Pressable onPress={() => router.back()} style={styles.close}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Card>
          <SectionHeader title="Backend" />
          <Text style={styles.lbl}>API base URL</Text>
          <Field placeholder="https://highlights.example.com" value={url} onChangeText={setUrl} autoCapitalize="none" />
          <View style={{ height: spacing(3) }} />
          <Button
            label={saved ? 'Saved' : 'Save URL'}
            icon="save-outline"
            onPress={async () => {
              await setBaseUrl(url);
              setSaved(true);
              setTimeout(() => setSaved(false), 1500);
            }}
          />
        </Card>

        {email ? (
          <Card style={{ marginTop: spacing(4) }}>
            <SectionHeader title="Account" />
            <Text style={styles.acc}>{email}</Text>
            <View style={{ height: spacing(3) }} />
            <Button label="Sign out" icon="log-out-outline" variant="danger" onPress={async () => {
              await logout();
              router.replace('/login');
            }} />
          </Card>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing(4) },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: spacing(4) },
  lbl: { ...typography.label, marginBottom: spacing(2) },
  acc: { ...typography.body, color: colors.textDim },
});
