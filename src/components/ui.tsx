import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const bg =
    variant === 'primary' ? colors.primary : variant === 'danger' ? colors.danger : 'transparent';
  const border = variant === 'ghost' ? colors.border : 'transparent';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <View style={styles.btnRow}>
          {icon ? <Ionicons name={icon} size={18} color={colors.text} /> : null}
          <Text style={styles.btnText}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeader({
  title,
  right,
}: {
  title: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={typography.h2}>{title}</Text>
      {right}
    </View>
  );
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderLabelRow}>
        <Text style={typography.label}>{label}</Text>
        <Text style={styles.sliderValue}>{format ? format(value) : value.toFixed(2)}</Text>
      </View>
      <Slider
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary2}
      />
    </View>
  );
}

export function Field({
  placeholder,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
}: {
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences';
  secureTextEntry?: boolean;
}) {
  return (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      secureTextEntry={secureTextEntry}
      style={styles.input}
    />
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segmentItem, active && styles.segmentItemActive]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}
    >
      <Text style={[styles.chipText, active && { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={[styles.toggle, { backgroundColor: value ? colors.primary : colors.surface2 }]}
    >
      <View style={[styles.toggleKnob, { alignSelf: value ? 'flex-end' : 'flex-start' }]} />
    </Pressable>
  );
}

export function Empty({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={42} color={colors.textFaint} />
      <Text style={[typography.body, { color: colors.textDim, marginTop: spacing(3) }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.md,
    paddingVertical: spacing(3.5),
    paddingHorizontal: spacing(5),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  btnText: { ...typography.title, fontSize: 15 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(4),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(3),
  },
  sliderRow: { marginBottom: spacing(2) },
  sliderLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sliderValue: { ...typography.caption, color: colors.primary2, fontSize: 12 },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3.5),
    fontSize: 15,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: 3,
  },
  segmentItem: { flex: 1, paddingVertical: spacing(2.5), borderRadius: radius.sm, alignItems: 'center' },
  segmentItemActive: { backgroundColor: colors.primary },
  segmentText: { ...typography.label, color: colors.textDim },
  segmentTextActive: { color: colors.text },
  chip: {
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(2),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    maxWidth: 160,
  },
  chipText: { ...typography.label, color: colors.textDim },
  toggle: { width: 46, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  empty: { alignItems: 'center', justifyContent: 'center', padding: spacing(10) },
});
