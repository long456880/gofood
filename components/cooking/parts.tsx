import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { getIngredientArt } from '@/components/IngredientIcon';
import { categorizeIngredient, type IngredientCategory } from '@/lib/ingredient-utils';
import { bell, easeOut, seg, useLoop } from './motion';

// Every scene is authored in this square coordinate space and scaled to fit,
// so all art and positions below are plain, readable numbers.
export const ART = 200;

export const INK = '#3A2318';
export const CREAM = '#FFF6E9';
export const STEEL = '#DDE7EF';
export const STEEL_DEEP = '#B4C4D2';
export const WOOD = '#D89B5B';
export const WOOD_DEEP = '#AE7439';
export const BROTH = '#F0A43C';
export const BUTTER = '#FFC93C';
export const WATER = '#8FD3E8';
export const FLAME = '#FF8A2B';
export const FLAME_CORE = '#FFD23F';
export const PAN = '#4C4C58';
export const PAN_DEEP = '#33333D';

const CATEGORY_COLOR: Record<IngredientCategory, string> = {
  meat: '#D9694F',
  seafood: '#6FA8C9',
  vegetable: '#5BA84F',
  fruit: '#F0912E',
  dairy: '#F1E4C6',
  grain: '#E4CF9C',
  spice: '#C4562F',
  sweet: '#D9A05B',
  herb: '#4E9A72',
  liquid: '#8FC5D8',
  other: '#C9A87C',
};

/* ---------------- stage ---------------- */

// A lit counter-top window the scene plays inside. Sized by the caller; the
// art space is centred within it, so scenes never do their own scaling math.
export function Stage({ width, children }: { width: number; children: ReactNode }) {
  const height = Math.round(width * 0.88);
  return (
    <View style={[styles.stage, { width, height }]}>
      <View
        style={[
          styles.artBox,
          { left: (width - ART) / 2, top: (height - ART) / 2, transform: [{ scale: width / ART }] },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

// The work surface everything sits on — gives the scene a floor so objects
// read as resting on something instead of floating.
export function Counter({ y = 150 }: { y?: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={ART} height={ART} viewBox={`0 0 ${ART} ${ART}`}>
        <Rect x={-20} y={y} width={ART + 40} height={ART} fill="#F4E1C5" />
        <Rect x={-20} y={y} width={ART + 40} height={4} fill="#E2C8A2" />
      </Svg>
    </View>
  );
}

/* ---------------- particles ---------------- */

export function Steam({
  x,
  y,
  delay = 0,
  size = 30,
  period = 2800,
  tint = '#FFFFFF',
}: {
  x: number;
  y: number;
  delay?: number;
  size?: number;
  period?: number;
  tint?: string;
}) {
  const p = useLoop(period, delay);
  const style = useAnimatedStyle(() => {
    const t = p.value;
    const rise = easeOut(t);
    const opacity = t < 0.14 ? (t / 0.14) * 0.75 : Math.max(0, (1 - (t - 0.14) / 0.86) * 0.75);
    return {
      opacity,
      transform: [
        { translateY: -56 * rise },
        { translateX: Math.sin(t * Math.PI * 2.4) * 8 },
        { scale: 0.45 + rise * 0.9 },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x - size / 2, top: y - size }, style]}>
      <Svg width={size} height={size * 1.2} viewBox="0 0 30 36">
        <Path
          d="M15 1 C23 7 26 14 21 20 C17 25 20 29 15 35 C10 29 13 25 9 20 C4 14 7 7 15 1 Z"
          fill={tint}
          opacity={0.8}
        />
      </Svg>
    </Animated.View>
  );
}

export function Bubble({
  x,
  y,
  delay = 0,
  size = 10,
  period = 1500,
  color = '#FFE6B8',
}: {
  x: number;
  y: number;
  delay?: number;
  size?: number;
  period?: number;
  color?: string;
}) {
  const p = useLoop(period, delay);
  const style = useAnimatedStyle(() => {
    const t = p.value;
    const grow = seg(t, 0, 0.72);
    const pop = seg(t, 0.72, 1);
    return {
      opacity: pop > 0 ? 1 - pop : Math.min(1, t / 0.15),
      transform: [{ translateY: -grow * 5 }, { scale: 0.25 + grow * 0.8 + pop * 0.7 }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x - size / 2, top: y - size / 2 }, style]}>
      <Svg width={size} height={size} viewBox="0 0 12 12">
        <Circle cx={6} cy={6} r={5} fill={color} stroke={INK} strokeWidth={1.3} />
        <Circle cx={4.3} cy={4.3} r={1.3} fill="#FFFFFF" opacity={0.9} />
      </Svg>
    </Animated.View>
  );
}

export function Sparkle({
  x,
  y,
  delay = 0,
  size = 16,
  period = 1800,
  color = '#FFD34E',
}: {
  x: number;
  y: number;
  delay?: number;
  size?: number;
  period?: number;
  color?: string;
}) {
  const p = useLoop(period, delay);
  const style = useAnimatedStyle(() => {
    const s = bell(p.value, 0, 0.55);
    return { opacity: s, transform: [{ scale: 0.35 + s * 0.9 }, { rotate: `${p.value * 130}deg` }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x - size / 2, top: y - size / 2 }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M12 0 C13.4 8.4 15.6 10.6 24 12 C15.6 13.4 13.4 15.6 12 24 C10.6 15.6 8.4 13.4 0 12 C8.4 10.6 10.6 8.4 12 0 Z"
          fill={color}
        />
      </Svg>
    </Animated.View>
  );
}

function Flame({
  x,
  y,
  delay,
  w,
  h,
  period,
}: {
  x: number;
  y: number;
  delay: number;
  w: number;
  h: number;
  period: number;
}) {
  const p = useLoop(period, delay);
  const style = useAnimatedStyle(() => {
    const f = (Math.sin(p.value * Math.PI * 2) + 1) / 2;
    return {
      opacity: 0.85 + f * 0.15,
      transform: [{ translateY: -f * 2 }, { scaleY: 0.85 + f * 0.35 }, { scaleX: 1.06 - f * 0.14 }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x - w / 2, top: y - h }, style]}>
      <Svg width={w} height={h} viewBox="0 0 24 40">
        <Path d="M12 1 C19 12 24 18 24 26 C24 34 18 39 12 39 C6 39 0 34 0 26 C0 18 5 12 12 1 Z" fill={FLAME} />
        <Path d="M12 15 C16 22 18 24 18 28 C18 33 15 36 12 36 C9 36 6 33 6 28 C6 24 8 22 12 15 Z" fill={FLAME_CORE} />
      </Svg>
    </Animated.View>
  );
}

// Burner ring plus its flame cluster. Render before the pot/pan so the
// flames sit behind the vessel they're heating.
export function Burner({
  cx,
  y,
  width = 96,
  intensity = 1,
}: {
  cx: number;
  y: number;
  width?: number;
  intensity?: number;
}) {
  const sizes = [0.66, 0.86, 1, 0.86, 0.66];
  return (
    <>
      <View style={{ position: 'absolute', left: cx - width / 2, top: y - 4 }}>
        <Svg width={width} height={14} viewBox={`0 0 ${width} 14`}>
          <Rect x={0} y={4} width={width} height={8} rx={4} fill="#54545F" stroke={INK} strokeWidth={2.4} />
        </Svg>
      </View>
      {sizes.map((s, i) => {
        const spread = width - 26;
        const fx = cx - spread / 2 + (i / (sizes.length - 1)) * spread;
        const scale = s * intensity;
        return (
          <Flame key={i} x={fx} y={y - 1} w={20 * scale} h={32 * scale} delay={i * 95} period={600 + i * 45} />
        );
      })}
    </>
  );
}

export function HeatWave({
  x,
  y,
  delay = 0,
  size = 28,
  period = 2200,
  color = '#E8A15C',
}: {
  x: number;
  y: number;
  delay?: number;
  size?: number;
  period?: number;
  color?: string;
}) {
  const p = useLoop(period, delay);
  const style = useAnimatedStyle(() => {
    const t = p.value;
    return {
      opacity: bell(t, 0, 1) * 0.65,
      transform: [{ translateY: -30 * t }, { translateX: Math.sin(t * Math.PI * 3) * 5 }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x - size / 2, top: y }, style]}>
      <Svg width={size} height={size * 0.5} viewBox="0 0 28 14">
        <Path
          d="M2 8 C6 2 10 12 14 7 C18 2 22 12 26 7"
          fill="none"
          stroke={color}
          strokeWidth={2.6}
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}

/* ---------------- ingredients ---------------- */

// Draws the step's real ingredient using the app's existing ingredient art,
// falling back to a category-coloured piece when there's no drawing for it.
// Always occupies a 32x32 box regardless of `size`, so callers offset by 16.
export function IngredientBit({ name, size = 32 }: { name?: string; size?: number }) {
  const art = name ? getIngredientArt(name) : null;
  const color = name ? CATEGORY_COLOR[categorizeIngredient(name)] : CATEGORY_COLOR.other;
  return (
    <View style={{ width: 32, height: 32, transform: [{ scale: size / 32 }] }}>
      {art ? (
        art()
      ) : (
        <Svg width={32} height={32} viewBox="0 0 32 32">
          <Circle cx={16} cy={16} r={12} fill={color} stroke={INK} strokeWidth={2.4} />
          <Circle cx={11.5} cy={11.5} r={3.4} fill="#FFFFFF" opacity={0.45} />
        </Svg>
      )}
    </View>
  );
}

export function ingredientColor(name?: string): string {
  return name ? CATEGORY_COLOR[categorizeIngredient(name)] : CATEGORY_COLOR.other;
}

const styles = StyleSheet.create({
  stage: {
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#FFF8EE',
    borderWidth: 2,
    borderColor: '#F1DEC2',
  },
  artBox: { position: 'absolute', width: ART, height: ART },
});
