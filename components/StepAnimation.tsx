import { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

export type Technique = 'stir' | 'whisk' | 'slice' | 'chop' | 'fold' | 'pour' | 'flip' | 'simmer' | 'general';

// Scans a step's text and figures out which technique to animate.
// Falls back to 'general' so every step always shows an animation.
export function getTechnique(stepText: string): Technique {
  const text = stepText.toLowerCase();
  if (text.includes('whisk') || text.includes('វាយ')) return 'whisk';
  if (text.includes('fold') || text.includes('បត់')) return 'fold';
  if (text.includes('stir') || text.includes('ឆា') || text.includes('លាយ')) return 'stir';
  if (text.includes('slice') || text.includes('ចិត')) return 'slice';
  if (text.includes('chop') || text.includes('កាត់')) return 'chop';
  if (text.includes('pour') || text.includes('ចាក់')) return 'pour';
  if (text.includes('flip') || text.includes('ត្រឡប់')) return 'flip';
  if (text.includes('simmer') || text.includes('ស្ងោរ') || text.includes('ដាំ')) return 'simmer';
  return 'general';
}

// Maps each of the 8 techniques onto your 4 real downloaded animation files.
// Multiple techniques reusing the same file is intentional and looks fine.
const ANIMATIONS: Record<Technique, any> = {
  stir: require('../assets/animations/pot.json'),
  simmer: require('../assets/animations/pot.json'),
  general: require('../assets/animations/pot.json'),
  whisk: require('../assets/animations/pour.json'),
  fold: require('../assets/animations/pour.json'),
  pour: require('../assets/animations/pour.json'),
  slice: require('../assets/animations/knife.json'),
  chop: require('../assets/animations/knife.json'),
  flip: require('../assets/animations/flip.json'),
};

export default function StepAnimation({ technique }: { technique: Technique }) {
  const ref = useRef<LottieView>(null);

  useEffect(() => {
    ref.current?.play();
  }, [technique]);

  return (
    <View style={styles.container}>
      <View style={styles.circle}>
        <LottieView
          ref={ref}
          source={ANIMATIONS[technique]}
          autoPlay
          loop
          style={styles.lottie}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  circle: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lottie: { width: 165, height: 165 },
});
