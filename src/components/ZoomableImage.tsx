import { useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { AuthedImage } from './AuthedImage';

type Props = {
  path: string;
  placeholderPath?: string;
  /** Fires when the image becomes zoomed-in (true) or returns to fit (false). */
  onZoomChange?: (zoomed: boolean) => void;
};

/** Full-screen image with pinch-to-zoom, pan-when-zoomed, and double-tap reset. */
export function ZoomableImage({ path, placeholderPath, onZoomChange }: Props) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);
  // Drives whether one-finger pan is active. While NOT zoomed, pan is disabled so
  // the horizontal pager (FlatList) receives the swipe instead (critical on Android).
  const [zoomed, setZoomed] = useState(false);

  const notify = (z: boolean) => {
    setZoomed(z);
    onZoomChange?.(z);
  };

  const reset = () => {
    'worklet';
    scale.value = withTiming(1);
    savedScale.value = 1;
    tx.value = withTiming(0);
    ty.value = withTiming(0);
    savedTx.value = 0;
    savedTy.value = 0;
    runOnJS(notify)(false);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, savedScale.value * e.scale);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1) {
        reset();
      } else {
        runOnJS(notify)(true);
      }
    });

  const pan = Gesture.Pan()
    .minPointers(1)
    .enabled(zoomed)
    .onUpdate((e) => {
      if (scale.value > 1) {
        tx.value = savedTx.value + e.translationX;
        ty.value = savedTy.value + e.translationY;
      }
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        reset();
      } else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
        runOnJS(notify)(true);
      }
    });

  const gesture = Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan));

  const animatedStyle = useAnimatedStyle(() => ({
    width: '100%',
    height: '100%',
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        <AuthedImage
          path={path}
          placeholderPath={placeholderPath}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
          transition={0}
        />
      </Animated.View>
    </GestureDetector>
  );
}
