import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2;
// Drag distance / velocity past which a 1x swipe down dismisses.
const DISMISS_THRESHOLD = 120;
const DISMISS_VELOCITY = 900;
// At 1x, gestures steeper than vertical activate dismiss; flatter ones fail so
// the horizontal pager underneath claims them for page switching.
const AXIS_SLOP = 15;

type Props = {
  uri: string | null;
  thumbUri: string | null;
  onDismiss: () => void;
  // 0 = at rest, 1 = fully dragged away. Drives chrome fade in the parent.
  dragProgress: SharedValue<number>;
  // Reports zoom state so the parent pager can disable horizontal scrolling
  // while the image is zoomed in (otherwise panning fights paging).
  onZoomChange?: (zoomed: boolean) => void;
};

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

export function ZoomableImage({ uri, thumbUri, onDismiss, dragProgress, onZoomChange }: Props) {
  const { width, height } = useWindowDimensions();

  // React-side mirror of the zoom state. Drives `.enabled()` on the two pans and
  // is forwarded to the parent so it can freeze the pager while zoomed.
  const [zoomed, setZoomed] = useState(false);
  const reportZoom = (next: boolean) => {
    setZoomed(next);
    onZoomChange?.(next);
  };

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const resetToFit = () => {
    'worklet';
    scale.value = withSpring(1);
    savedScale.value = 1;
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedX.value = 0;
    savedY.value = 0;
    // Writing a shared value passed by the parent is the intended reanimated
    // pattern; the react-compiler immutability lint doesn't model it.
    // eslint-disable-next-line react-hooks/immutability
    dragProgress.value = withSpring(0);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        resetToFit();
        runOnJS(reportZoom)(false);
      } else if (scale.value > MAX_SCALE) {
        scale.value = withSpring(MAX_SCALE);
        savedScale.value = MAX_SCALE;
        runOnJS(reportZoom)(true);
      } else {
        savedScale.value = scale.value;
        runOnJS(reportZoom)(scale.value > 1);
      }
    });

  // Active only at 1x: vertical swipe-to-dismiss. `failOffsetX` makes it bail on
  // horizontal drags so the pager gets them; `activeOffsetY` keeps it from
  // stealing taps.
  const dismissPan = Gesture.Pan()
    .enabled(!zoomed)
    .maxPointers(1)
    .activeOffsetY([-AXIS_SLOP, AXIS_SLOP])
    .failOffsetX([-AXIS_SLOP, AXIS_SLOP])
    .onUpdate((e) => {
      translateY.value = e.translationY;
      // eslint-disable-next-line react-hooks/immutability
      dragProgress.value = clamp(Math.abs(e.translationY) / (height / 2), 0, 1);
    })
    .onEnd((e) => {
      const dismissed =
        Math.abs(e.translationY) > DISMISS_THRESHOLD ||
        Math.abs(e.velocityY) > DISMISS_VELOCITY;
      if (dismissed) {
        runOnJS(onDismiss)();
      } else {
        resetToFit();
      }
    });

  // Active only when zoomed: pan within the scaled image's bounds. The pager is
  // frozen in this state, so this pan can own both axes freely.
  const zoomPan = Gesture.Pan()
    .enabled(zoomed)
    .onUpdate((e) => {
      const maxX = ((scale.value - 1) * width) / 2;
      const maxY = ((scale.value - 1) * height) / 2;
      translateX.value = clamp(savedX.value + e.translationX, -maxX, maxX);
      translateY.value = clamp(savedY.value + e.translationY, -maxY, maxY);
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd((e) => {
      if (scale.value > 1) {
        resetToFit();
        runOnJS(reportZoom)(false);
      } else {
        // Zoom toward the tapped point, keeping it stationary under the finger.
        scale.value = withSpring(DOUBLE_TAP_SCALE);
        savedScale.value = DOUBLE_TAP_SCALE;
        const tx = (width / 2 - e.x) * (DOUBLE_TAP_SCALE - 1);
        const ty = (height / 2 - e.y) * (DOUBLE_TAP_SCALE - 1);
        translateX.value = withSpring(tx);
        translateY.value = withSpring(ty);
        savedX.value = tx;
        savedY.value = ty;
        runOnJS(reportZoom)(true);
      }
    });

  const gesture = Gesture.Race(
    doubleTap,
    Gesture.Simultaneous(pinch, dismissPan, zoomPan),
  );

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.wrap, imageStyle]}>
        <Image
          source={uri ? { uri } : null}
          placeholder={thumbUri ? { uri: thumbUri } : null}
          placeholderContentFit="contain"
          transition={200}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          cachePolicy="memory"
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
});
