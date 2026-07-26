import { Ionicons } from '@expo/vector-icons';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Last-resort guard so a render crash shows a readable screen with a way out
 * instead of a blank/white app.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <View style={styles.wrap}>
        <Ionicons name="warning-outline" size={40} color={colors.warning} />
        <Text style={typography.h2}>Something broke</Text>
        <Text style={styles.msg}>{error.message}</Text>
        <Pressable style={styles.btn} onPress={() => this.setState({ error: null })}>
          <Text style={typography.title}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(8),
    gap: spacing(3),
  },
  msg: { ...typography.body, color: colors.textDim, textAlign: 'center' },
  btn: {
    marginTop: spacing(2),
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(6),
  },
});
