import { useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { AuthedImage } from '@/components/AuthedImage';
import { colors } from '@/theme';

/**
 * A collage cover for a highlight card.
 *
 * Every layout keeps one dominant "hero" tile. An even grid of equal tiles
 * reads as a contact sheet rather than a memory, and at card size (~170px
 * wide) four equal tiles leave each face about 80px across -- too small to
 * recognise anyone, which is usually the whole point of the photo.
 *
 * The layout is picked from the highlight's id, not at random: a card must
 * look identical across re-renders and list recycling, or it visibly reshuffles
 * while you scroll.
 *
 * No layout puts the hero along the bottom edge. The card's caption gradient
 * darkens the lower half, so a bottom hero is the one tile guaranteed to be
 * obscured -- exactly backwards.
 */

const GAP = 2;

type Layout = 'heroTop' | 'heroLeft' | 'heroRight';

const LAYOUTS: Layout[] = ['heroTop', 'heroLeft', 'heroRight'];

/** Small deterministic string hash (FNV-1a), so a given card always matches. */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

type Props = {
  /** Ranked thumbnail paths, cover first. */
  paths: string[];
  /** Stable seed; the highlight id. */
  seed: string;
  style?: ViewStyle;
};

export function CollageCover({ paths, seed, style }: Props) {
  const layout = useMemo(() => LAYOUTS[hashString(seed) % LAYOUTS.length], [seed]);

  // A cover is decoration, not a control. Without this, a tile that exhausted
  // its retries renders AuthedImage's retry button, which would eat the tap
  // that should open the highlight.
  return (
    <View style={[styles.wrap, style]} pointerEvents="none">
      {renderTiles(paths, layout)}
    </View>
  );
}

function renderTiles(paths: string[], layout: Layout) {
  // Below three images there is nothing to arrange, so show a single photo.
  // Stretching two across a three-slot layout just looks like a bug.
  if (paths.length < 3) {
    return <AuthedImage path={paths[0]} style={styles.fill} spinner={false} />;
  }

  const [a, b, c] = paths;

  if (layout === 'heroLeft') {
    return (
      <View style={styles.row}>
        <Tile path={a} flex={2.1} />
        <View style={styles.gapV} />
        <View style={styles.col}>
          <Tile path={b} flex={1} />
          <View style={styles.gapH} />
          <Tile path={c} flex={1} />
        </View>
      </View>
    );
  }

  if (layout === 'heroRight') {
    return (
      <View style={styles.row}>
        <View style={styles.col}>
          <Tile path={b} flex={1} />
          <View style={styles.gapH} />
          <Tile path={c} flex={1} />
        </View>
        <View style={styles.gapV} />
        <Tile path={a} flex={2.1} />
      </View>
    );
  }

  return (
    <>
      <Tile path={a} flex={2.1} />
      <View style={styles.gapH} />
      <View style={styles.row}>
        <Tile path={b} flex={1} />
        <View style={styles.gapV} />
        <Tile path={c} flex={1} />
      </View>
    </>
  );
}

function Tile({ path, flex }: { path: string; flex: number }) {
  // No spinner per tile: three spinners inside one small card is visual noise,
  // and the blurhash placeholder already reads as "loading".
  return <AuthedImage path={path} style={{ flex }} spinner={false} transition={220} />;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface2 },
  fill: { flex: 1 },
  row: { flex: 1, flexDirection: 'row' },
  col: { flex: 1, flexDirection: 'column' },
  gapH: { height: GAP },
  gapV: { width: GAP },
});
