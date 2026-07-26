import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '@/theme';

export type SheetAction = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  /** Renders in red and is separated from the rest. */
  destructive?: boolean;
  /** Secondary line under the label, for anything that needs a warning. */
  detail?: string;
  disabled?: boolean;
};

/**
 * An action sheet.
 *
 * This replaces stacked `Alert.alert` menus. Android caps an alert at three
 * buttons, which forced a second "More…" level and buried destructive actions
 * behind the same tap as safe ones. A sheet has no such limit, so every action
 * for an album is visible at once, each with an icon and room to explain itself.
 */
export function BottomSheet({
  visible,
  title,
  subtitle,
  actions,
  onClose,
}: {
  visible: boolean;
  title?: string;
  subtitle?: string;
  actions: SheetAction[];
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Only animate in. Animating out would mean keeping the Modal mounted past
    // `visible`, and a half-faded sheet during a route change looks broken.
    if (!visible) {
      slide.setValue(0);
      return;
    }
    Animated.timing(slide, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [height * 0.25, 0],
  });

  const safe = [...actions].sort((a, b) => Number(!!a.destructive) - Number(!!b.destructive));
  const firstDestructive = safe.findIndex((a) => a.destructive);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* The backdrop is the dismiss target, so it must cover everything. */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + spacing(3), transform: [{ translateY }] },
          ]}
        >
          {/* Swallow taps: without this, a tap on the sheet reaches the backdrop. */}
          <Pressable onPress={() => {}}>
            <View style={styles.grabber} />
            {title ? (
              <View style={styles.head}>
                <Text style={styles.title} numberOfLines={1}>
                  {title}
                </Text>
                {subtitle ? (
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {safe.map((a, i) => (
              <View key={a.label}>
                {i === firstDestructive && i > 0 ? <View style={styles.divider} /> : null}
                <Pressable
                  onPress={() => {
                    onClose();
                    a.onPress();
                  }}
                  disabled={a.disabled}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                    a.disabled && styles.rowDisabled,
                  ]}
                >
                  <View style={[styles.iconWrap, a.destructive && styles.iconWrapDanger]}>
                    <Ionicons
                      name={a.icon}
                      size={19}
                      color={a.destructive ? colors.danger : colors.text}
                    />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={[styles.label, a.destructive && styles.labelDanger]}>
                      {a.label}
                    </Text>
                    {a.detail ? <Text style={styles.detail}>{a.detail}</Text> : null}
                  </View>
                </Pressable>
              </View>
            ))}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing(2),
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginBottom: spacing(2),
  },
  head: { paddingHorizontal: spacing(5), paddingBottom: spacing(2) },
  title: { ...typography.title },
  subtitle: { ...typography.caption, marginTop: 2 },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing(2),
    marginHorizontal: spacing(5),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3.5),
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(3),
  },
  rowPressed: { backgroundColor: colors.surface2 },
  rowDisabled: { opacity: 0.4 },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDanger: { backgroundColor: 'rgba(255,92,92,0.12)' },
  rowText: { flex: 1 },
  label: { ...typography.body, fontWeight: '600' },
  labelDanger: { color: colors.danger },
  detail: { ...typography.caption, marginTop: 2 },
});
