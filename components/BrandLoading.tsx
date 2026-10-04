import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const RED = '#D62828';

// The three dots pulse in sequence, so the screen reads as "working" even on a
// session check short enough that a spinner would only flicker.
function Dot({ index }: { index: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      index * 180,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 420, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      )
    );
  }, [index, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + progress.value * 0.65,
    transform: [{ scale: 0.8 + progress.value * 0.35 }],
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

export default function BrandLoading() {
  const breathe = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
  }, [breathe]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breathe.value * 0.05 }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + breathe.value * 0.16,
    transform: [{ scale: 1 + breathe.value * 0.12 }],
  }));

  return (
    <LinearGradient colors={['#E8342F', RED, '#A81F1F']} style={styles.root}>
      <View style={styles.circleTop} />
      <View style={styles.circleBottom} />

      <View style={styles.center}>
        <View style={styles.logoWrap}>
          <Animated.View style={[styles.halo, haloStyle]} />
          <Animated.View style={[styles.logoBadge, logoStyle]}>
            <Image
              source={require('../assets/images/gofood-hat-512.png')}
              style={styles.logoHat}
              contentFit="contain"
            />
          </Animated.View>
        </View>

        <Text style={styles.wordmark}>GoFood</Text>

        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <Dot key={i} index={i} />
          ))}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  circleTop: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -120,
    right: -90,
  },
  circleBottom: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -60,
    left: -80,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoWrap: { alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#FFFFFF',
  },
  logoBadge: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  logoHat: { width: 68, height: 56 },
  wordmark: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginTop: 22,
  },
  dots: { flexDirection: 'row', gap: 8, marginTop: 26 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
});
