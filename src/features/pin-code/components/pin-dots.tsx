import { forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

const PRIMARY = '#208AEF';
const DOT_SIZE = 14;

export type PinDotsHandle = { shake: () => void };

export const PinDots = forwardRef<PinDotsHandle, { length: number }>(({ length }, ref) => {
  const theme = useTheme();
  const offsetX = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }],
  }));

  useImperativeHandle(ref, () => ({
    shake: () => {
      offsetX.value = withSequence(
        withTiming(10, { duration: 55 }),
        withTiming(-10, { duration: 55 }),
        withTiming(10, { duration: 55 }),
        withTiming(-10, { duration: 55 }),
        withTiming(0, { duration: 55 }),
      );
    },
  }));

  return (
    <Animated.View style={[styles.row, animatedStyle]}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: i < length ? PRIMARY : 'transparent',
              borderColor: i < length ? PRIMARY : theme.backgroundElement,
            },
          ]}
        />
      ))}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
  },
});
