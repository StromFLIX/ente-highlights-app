import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useIsOnline } from '@/lib/offline';
import { colors, spacing, typography } from '@/theme';

/** Thin persistent bar so "nothing is loading" is never a mystery. */
export function OfflineBanner() {
  const online = useIsOnline();
  if (online) return null;
  return (
    <View style={styles.bar}>
      <Ionicons name="cloud-offline-outline" size={14} color={colors.bg} />
      <Text style={styles.text}>You're offline — showing saved results</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(2),
    backgroundColor: colors.warning,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(4),
  },
  text: { ...typography.caption, color: colors.bg, fontSize: 12 },
});
