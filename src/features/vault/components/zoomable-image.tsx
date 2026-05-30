import { Image } from 'expo-image';
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
// Drag distance / velocity past which a 1x swipe (up or down) dismisses.
const DISMISS_THRESHOLD = 120;
const DISMISS_VELOCITY = 900;

type Props = {
  uri: string | null;
  thumbUri: string | null;
  onDismiss: () => void;
  // 0 = at rest, 1 = fully dragged away. Drives chrome fade in the parent.
  dragProgress: SharedValue<number>;
};

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

export function ZoomableImage({ uri, thumbUri, onDismiss, dragProgress }: Props) {
  const { width, height } = useWindowDimensions();

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
      } else if (scale.value > MAX_SCALE) {
        scale.value = withSpring(MAX_SCALE);
        savedScale.value = MAX_SCALE;
      } else {
        savedScale.value = scale.value;
      }
    });

  const pan = Gesture.Pan()
    .maxPointers(1) // 1 finger = pan / swipe-to-dismiss; 2 fingers = pinch only
    .onUpdate((e) => {
      if (scale.value > 1) {
        // Pan the zoomed image within its scaled bounds.
        const maxX = ((scale.value - 1) * width) / 2;
        const maxY = ((scale.value - 1) * height) / 2;
        translateX.value = clamp(savedX.value + e.translationX, -maxX, maxX);
        translateY.value = clamp(savedY.value + e.translationY, -maxY, maxY);
      } else {
        // At 1x: vertical swipe (up or down) to dismiss; image follows finger.
        translateY.value = e.translationY;
        translateX.value = e.translationX * 0.4;
        // eslint-disable-next-line react-hooks/immutability
        dragProgress.value = clamp(Math.abs(e.translationY) / (height / 2), 0, 1);
      }
    })
    .onEnd((e) => {
      if (scale.value > 1) {
        savedX.value = translateX.value;
        savedY.value = translateY.value;
        return;
      }
      const dismissed =
        Math.abs(e.translationY) > DISMISS_THRESHOLD ||
        Math.abs(e.velocityY) > DISMISS_VELOCITY;
      if (dismissed) {
        runOnJS(onDismiss)();
      } else {
        resetToFit();
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd((e) => {
      if (scale.value > 1) {
        resetToFit();
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
      }
    });

  const gesture = Gesture.Race(
    doubleTap,
    Gesture.Simultaneous(pinch, pan),
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
