import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const CLOSE_THRESHOLD = 80;

export function BottomSheet({ isOpen, onClose, children }: Props) {
  const theme = useTheme();
  const translateY = useSharedValue(400);
  const opacity = useSharedValue(0);
  const dragY = useSharedValue(0);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Mount the Modal first, then run the open animation on its shared values.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModalVisible(true);
      dragY.value = 0;
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withTiming(0, { duration: 300 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(400, { duration: 300 }, (finished) => {
        if (finished) runOnJS(setModalVisible)(false);
      });
    }
  }, [isOpen, dragY, opacity, translateY]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        // eslint-disable-next-line react-hooks/immutability
        dragY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > CLOSE_THRESHOLD) {
        runOnJS(onClose)();
      } else {
        // eslint-disable-next-line react-hooks/immutability
        dragY.value = withTiming(0, { duration: 200 });
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value + dragY.value }],
  }));

  return (
    <Modal visible={modalVisible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.sheet, { backgroundColor: theme.backgroundElement }, sheetStyle]}>
            <View style={[styles.handle, { backgroundColor: theme.backgroundSelected }]} />
            {children}
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 40,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
});
