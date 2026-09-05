import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

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

// A single 0→1 looping driver. Every visual detail (position, rotation,
// opacity) is computed as a plain function of this one value, so every
// part of an animation always stays perfectly in sync with every other part.
function useLoop(durationMs: number, delayMs = 0) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(
      delayMs,
      withRepeat(withTiming(1, { duration: durationMs, easing: Easing.linear }), -1, false)
    );
  }, []);
  return progress;
}

/* ---------------- POT (stir / simmer / general) ---------------- */

function Steam({ delayMs, left }: { delayMs: number; left: number }) {
  const p = useLoop(2600, delayMs);
  const style = useAnimatedStyle(() => {
    const rise = p.value;
    const opacity = rise < 0.15 ? rise * 6 : Math.max(0, (1 - rise) * 1.1);
    return {
      opacity,
      transform: [{ translateY: -46 * rise }, { scale: 0.6 + rise * 0.7 }],
    };
  });
  return <Animated.View style={[styles.steam, { left }, style]} />;
}

function Bubble({ delayMs, left }: { delayMs: number; left: number }) {
  const p = useLoop(1800, delayMs);
  const style = useAnimatedStyle(() => {
    const t = p.value;
    const rise = t < 0.4 ? t / 0.4 : Math.max(0, 1 - (t - 0.4) / 0.6);
    return { opacity: rise, transform: [{ scale: 0.4 + rise * 0.9 }] };
  });
  return <Animated.View style={[styles.bubble, { left }, style]} />;
}

function PotAnimation() {
  const p = useLoop(1600);
  const spoonStyle = useAnimatedStyle(() => {
    const angle = p.value * Math.PI * 2;
    return {
      transform: [
        { translateX: Math.cos(angle) * 15 },
        { translateY: Math.sin(angle) * 4 + 2 },
        { rotate: '20deg' },
      ],
    };
  });

  return (
    <View style={styles.scene}>
      <Steam delayMs={0} left={78} />
      <Steam delayMs={600} left={100} />
      <Steam delayMs={1200} left={122} />
      <View style={styles.pot}>
        <View style={[styles.potHandle, { left: -16 }]} />
        <View style={[styles.potHandle, { right: -16 }]} />
        <View style={styles.potBody} />
        <View style={styles.potRim}>
          <View style={styles.soup}>
            <Bubble delayMs={0} left={20} />
            <Bubble delayMs={500} left={55} />
            <Bubble delayMs={1000} left={85} />
            <Bubble delayMs={1400} left={108} />
          </View>
        </View>
        <Animated.View style={[styles.spoonPivot, spoonStyle]}>
          <View style={styles.spoon}>
            <View style={styles.spoonHead} />
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

/* ---------------- KNIFE (slice / chop) ---------------- */

function KnifeAnimation() {
  const p = useLoop(1100);

  const bump = (t: number) => {
    'worklet';
    const w = 0.4;
    return t < w ? Math.sin((t / w) * Math.PI) : 0;
  };

  const knifeStyle = useAnimatedStyle(() => {
    const b = bump(p.value);
    return {
      transform: [{ translateY: b * 26 }, { rotate: `${-10 + b * 10}deg` }],
    };
  });
  const impactStyle = useAnimatedStyle(() => {
    const b = bump(p.value);
    return { opacity: b > 0.8 ? (b - 0.8) / 0.2 : 0 };
  });
  const leftHalfStyle = useAnimatedStyle(() => {
    const b = bump(p.value);
    return { transform: [{ translateX: -b * 4 }] };
  });
  const rightHalfStyle = useAnimatedStyle(() => {
    const b = bump(p.value);
    return { transform: [{ translateX: b * 4 }] };
  });

  return (
    <View style={styles.scene}>
      <View style={styles.board}>
        <Animated.View style={[styles.impactFlash, impactStyle]} />
        <Animated.View style={[styles.veggieHalf, { left: 62 }, leftHalfStyle]} />
        <Animated.View style={[styles.veggieHalf, { left: 78 }, rightHalfStyle]} />
      </View>
      <Animated.View style={[styles.knife, knifeStyle]}>
        <View style={styles.knifeBlade} />
        <View style={styles.knifeHandle} />
      </Animated.View>
    </View>
  );
}

/* ---------------- POUR (whisk / fold / pour) ---------------- */

function Droplet({ delayMs }: { delayMs: number }) {
  const p = useLoop(1000, delayMs);
  const style = useAnimatedStyle(() => {
    const t = p.value;
    return {
      opacity: t < 0.7 ? 1 - t / 0.7 : 0,
      transform: [{ translateY: t * 38 }],
    };
  });
  return <Animated.View style={[styles.droplet, style]} />;
}

function PourAnimation() {
  const p = useLoop(1800);
  const streamStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: Math.sin(p.value * Math.PI * 6) * 2 }],
  }));
  const bowlStyle = useAnimatedStyle(() => {
    const level = 8 + (p.value % 1) * 6;
    return { height: level };
  });

  return (
    <View style={styles.scene}>
      <View style={styles.jug}>
        <View style={styles.jugBody} />
        <View style={styles.jugSpout} />
      </View>
      <Animated.View style={[styles.stream, streamStyle]} />
      <Droplet delayMs={0} />
      <Droplet delayMs={330} />
      <Droplet delayMs={660} />
      <View style={styles.bowl}>
        <Animated.View style={[styles.bowlLiquid, bowlStyle]} />
      </View>
    </View>
  );
}

/* ---------------- FLIP ---------------- */

function FlipAnimation() {
  const p = useLoop(1400);
  const foodStyle = useAnimatedStyle(() => {
    const t = p.value;
    return {
      transform: [
        { translateY: -Math.sin(t * Math.PI) * 46 },
        { translateX: Math.sin(t * Math.PI * 2) * 5 },
        { rotate: `${t * 720}deg` },
      ],
    };
  });
  const sparkleStyle = useAnimatedStyle(() => {
    const t = p.value;
    const near = Math.max(0, 1 - Math.abs(t - 0.5) * 8);
    return { opacity: near };
  });

  return (
    <View style={styles.scene}>
      <Animated.View style={[styles.sparkle, { left: 70 }, sparkleStyle]} />
      <Animated.View style={[styles.sparkle, { left: 100, top: 40 }, sparkleStyle]} />
      <Animated.View style={[styles.food, foodStyle]} />
      <View style={styles.pan}>
        <View style={styles.panBody} />
        <View style={styles.panHandle} />
      </View>
    </View>
  );
}

/* ---------------- Main export ---------------- */

const CATEGORY: Record<Technique, 'pot' | 'knife' | 'pour' | 'flip'> = {
  stir: 'pot',
  simmer: 'pot',
  general: 'pot',
  slice: 'knife',
  chop: 'knife',
  whisk: 'pour',
  fold: 'pour',
  pour: 'pour',
  flip: 'flip',
};

export default function StepAnimation({ technique }: { technique: Technique }) {
  const category = CATEGORY[technique];

  return (
    <View style={styles.container}>
      <View style={styles.circle}>
        {category === 'pot' && <PotAnimation />}
        {category === 'knife' && <KnifeAnimation />}
        {category === 'pour' && <PourAnimation />}
        {category === 'flip' && <FlipAnimation />}
      </View>
    </View>
  );
}

const RED = '#D62828';
const INK = '#241C1C';

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  circle: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(214,40,40,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  scene: { width: 165, height: 165, alignItems: 'center', justifyContent: 'center' },

  /* pot */
  steam: {
    position: 'absolute',
    top: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(214,40,40,0.5)',
  },
  bubble: { position: 'absolute', bottom: 0, width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#F9C0C0' },
  pot: { position: 'absolute', bottom: 22, width: 128, height: 74 },
  potHandle: { position: 'absolute', top: 14, width: 16, height: 16, borderRadius: 8, borderWidth: 4, borderColor: INK },
  potBody: { position: 'absolute', bottom: 0, width: 128, height: 58, backgroundColor: '#F3F3F3', borderRadius: 0, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, borderWidth: 4, borderTopWidth: 0, borderColor: INK },
  potRim: { position: 'absolute', top: 10, width: 128, height: 13, borderRadius: 8, backgroundColor: '#EAEAEA', borderWidth: 4, borderColor: INK, overflow: 'hidden', alignItems: 'center' },
  soup: { position: 'absolute', top: 4, width: 116, height: 9, backgroundColor: RED, borderRadius: 6 },
  spoonPivot: { position: 'absolute', top: -4, left: 64, width: 1, height: 1 },
  spoon: { width: 5, height: 48, backgroundColor: '#8B5A2B', borderRadius: 3 },
  spoonHead: { position: 'absolute', bottom: -5, left: -3.5, width: 12, height: 13, backgroundColor: '#8B5A2B', borderRadius: 7 },

  /* knife */
  board: { position: 'absolute', bottom: 46, width: 130, height: 16, backgroundColor: '#C99A5B', borderRadius: 8, borderWidth: 3, borderColor: INK, alignItems: 'center' },
  impactFlash: { position: 'absolute', top: -6, width: 30, height: 30, borderRadius: 15, backgroundColor: '#fff' },
  veggieHalf: { position: 'absolute', top: -10, width: 16, height: 16, borderRadius: 8, backgroundColor: '#E8871E', borderWidth: 2.5, borderColor: INK },
  knife: { position: 'absolute', bottom: 62, alignItems: 'center' },
  knifeBlade: { width: 12, height: 56, backgroundColor: '#DDE3E8', borderTopLeftRadius: 6, borderTopRightRadius: 6, borderWidth: 2.5, borderColor: INK },
  knifeHandle: { width: 10, height: 24, backgroundColor: '#5B3A29', borderRadius: 4, marginTop: -2, borderWidth: 2.5, borderColor: INK, borderTopWidth: 0 },

  /* pour */
  jug: { position: 'absolute', top: 8, right: 30, transform: [{ rotate: '-32deg' }], alignItems: 'center' },
  jugBody: { width: 46, height: 58, backgroundColor: '#BFE3E0', borderRadius: 10, borderWidth: 3.5, borderColor: INK },
  jugSpout: { position: 'absolute', bottom: -4, left: -8, width: 14, height: 10, backgroundColor: '#BFE3E0', borderWidth: 3, borderColor: INK, borderRadius: 3 },
  stream: { position: 'absolute', top: 66, left: 76, width: 5, height: 44, backgroundColor: '#BFE3E0', borderRadius: 3, opacity: 0.9 },
  droplet: { position: 'absolute', top: 100, left: 77, width: 4, height: 4, borderRadius: 2, backgroundColor: '#8FCFCB' },
  bowl: { position: 'absolute', bottom: 22, width: 108, height: 34, borderRadius: 16, borderWidth: 3.5, borderColor: INK, backgroundColor: '#F3F3F3', overflow: 'hidden', justifyContent: 'flex-end' },
  bowlLiquid: { width: '100%', backgroundColor: '#BFE3E0' },

  /* flip */
  pan: { position: 'absolute', bottom: 30, alignItems: 'center' },
  panBody: { width: 110, height: 22, borderRadius: 11, backgroundColor: '#3A3A3A', borderWidth: 3, borderColor: INK },
  panHandle: { position: 'absolute', right: -34, top: 6, width: 36, height: 8, backgroundColor: '#3A3A3A', borderRadius: 4, borderWidth: 2.5, borderColor: INK },
  food: { position: 'absolute', bottom: 52, width: 34, height: 34, borderRadius: 17, backgroundColor: '#E8A93D', borderWidth: 3, borderColor: INK },
  sparkle: { position: 'absolute', top: 30, width: 8, height: 8, borderRadius: 4, backgroundColor: '#C9971F' },
});