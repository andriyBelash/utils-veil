import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedView } from './themed-view';

type Props = {
  icon?: SymbolViewProps['name'];
  tint?: string;
  onFinish?: () => void;
};

const DEFAULT_ICON = { ios: 'checkmark', android: 'check', web: 'check' } as SymbolViewProps['name'];
const TOTAL_MS = 1300;

export function SuccessOverlay({ icon = DEFAULT_ICON, tint = '#34c759', onFinish }: Props) {
  const circleScale = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0);

  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    circleScale.value = withSequence(
      withTiming(1.15, { duration: 320, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 180, easing: Easing.inOut(Easing.cubic) }),
    );

    checkOpacity.value = withDelay(220, withTiming(1, { duration: 140 }));
    checkScale.value = withDelay(
      220,
      withSequence(
        withTiming(1.25, { duration: 240, easing: Easing.out(Easing.back(2.5)) }),
        withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) }),
      ),
    );

    ringOpacity.value = withDelay(
      240,
      withSequence(
        withTiming(0.45, { duration: 100 }),
        withTiming(0, { duration: 520, easing: Easing.out(Easing.cubic) }),
      ),
    );
    ringScale.value = withDelay(
      240,
      withTiming(2.3, { duration: 620, easing: Easing.out(Easing.cubic) }),
    );

    const timer = setTimeout(() => onFinishRef.current?.(), TOTAL_MS);
    return () => clearTimeout(timer);
  }, []);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkOpacity.value,
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <ThemedView style={styles.root}>
      <View style={styles.center}>
        <Animated.View style={[styles.ring, { borderColor: tint }, ringStyle]} />
        <Animated.View style={[styles.circle, { backgroundColor: tint }, circleStyle]}>
          <Animated.View style={checkStyle}>
            <SymbolView name={icon} size={64} tintColor="#ffffff" weight="bold" />
          </Animated.View>
        </Animated.View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
});
