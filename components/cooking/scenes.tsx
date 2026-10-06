import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import {
  Board,
  BowlBack,
  BowlFront,
  FoodMound,
  Jug,
  KNIFE,
  Knife,
  Leaf,
  OvenBody,
  PanArt,
  Plate,
  PotBack,
  PotFront,
  SPOON,
  Shaker,
  SlicePiece,
  Spatula,
  Spoon,
  WHISK,
  Whisk,
} from './art';
import {
  BROTH,
  Bubble,
  Burner,
  Counter,
  HeatWave,
  INK,
  IngredientBit,
  PAN,
  STEEL,
  STEEL_DEEP,
  Sparkle,
  Steam,
  WATER,
  WOOD,
  ingredientColor,
} from './parts';
import { bell, easeIn, easeInOut, easeOut, seg, settle, useLoop, wobble } from './motion';
import { categorizeIngredient } from '@/lib/ingredient-utils';

const COUNTER_Y = 164;
const MEAT_JUICE = '#A62A1E';

type SceneProps = { ingredients: string[] };

export type HeatLevel = 'low' | 'medium' | 'high';

// Flame size is the one cue a cook reads at a glance, so it tracks the heat
// the step asks for; without one, each scene keeps its own natural flame.
const HEAT_INTENSITY: Record<HeatLevel, number> = { low: 0.55, medium: 0.9, high: 1.3 };

function flameFor(heat: HeatLevel | null | undefined, fallback: number): number {
  return heat ? HEAT_INTENSITY[heat] : fallback;
}

function Dot({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  return (
    <View style={{ position: 'absolute', left: x - size / 2, top: y - size / 2 }}>
      <Svg width={size} height={size} viewBox="0 0 10 10">
        <Circle cx={5} cy={5} r={4.4} fill={color} stroke={INK} strokeWidth={1.2} />
      </Svg>
    </View>
  );
}

/* ================= chopping board — chop / slice ================= */

export function BoardScene({
  ingredients,
  variant,
  goesToPot = false,
}: SceneProps & { variant: 'chop' | 'slice'; goesToPot?: boolean }) {
  const isSlice = variant === 'slice';
  const item = ingredients[0];
  const color = ingredientColor(item);
  // Meat leaves juice on the board where a vegetable leaves dry crumbs, and
  // chopping through it is a slower, heavier stroke than dicing an onion —
  // but a thin slice off the same cut is still a light stroke.
  const isMeat = categorizeIngredient(item ?? '') === 'meat';
  const heavyStroke = isMeat && !isSlice;
  const p = useLoop(isSlice ? 1700 : heavyStroke ? 1900 : 1450);

  const LIFT = isSlice ? 20 : heavyStroke ? 36 : 30;
  // The blade comes down on the right-hand end of the item, so the ingredient
  // itself stays visible instead of disappearing under the cleaver.
  // Board box sits at y=124, putting its working surface at y=134.
  const FOOD_X = 62;
  const FOOD_Y = 116;
  const CUT_X = 88;

  // Anticipation (slow lift) → strike (fast fall) → ring-out. The knife never
  // moves at a constant speed, which is what stops it reading as mechanical.
  const knife = useAnimatedStyle(() => {
    const t = p.value;
    const lift = easeOut(seg(t, 0, 0.36));
    const fall = easeIn(seg(t, 0.36, 0.48));
    const after = seg(t, 0.48, 0.78);
    const swing = lift - fall;
    return {
      transform: [
        { translateX: isSlice ? -9 * lift + 9 * fall : 0 },
        { translateY: -LIFT * swing + settle(after, 1.6) * (heavyStroke ? 4.5 : 3) },
        { rotate: `${(heavyStroke ? -13 : -8) * swing + settle(after, 1.6) * 1.6}deg` },
      ],
    };
  });

  const board = useAnimatedStyle(() => ({
    transform: [{ translateY: settle(seg(p.value, 0.48, 0.76), 2.2) * 2.6 }],
  }));

  const flash = useAnimatedStyle(() => ({ opacity: bell(p.value, 0.48, 0.58) }));

  const food = useAnimatedStyle(() => {
    const hit = bell(p.value, 0.48, 0.64);
    return { transform: [{ scaleY: 1 - hit * 0.22 }, { scaleX: 1 + hit * 0.16 }] };
  });

  const cutLine = useAnimatedStyle(() => ({ opacity: bell(p.value, 0.47, 0.6) }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <Counter y={COUNTER_Y} />

      <Animated.View style={[StyleSheet.absoluteFill, board]}>
        <View style={{ position: 'absolute', left: 20, top: 124 }}>
          <Board />
        </View>

        {isMeat && <JuiceSmear p={p} x={CUT_X} y={132} />}

        <Animated.View style={[{ position: 'absolute', left: FOOD_X - 16, top: FOOD_Y - 16 }, food]}>
          <IngredientBit name={item} size={40} />
        </Animated.View>

        <Animated.View style={[{ position: 'absolute', left: CUT_X - 14, top: FOOD_Y - 2 }, cutLine]}>
          <Svg width={28} height={6} viewBox="0 0 28 6">
            <Rect x={0} y={1} width={28} height={3} rx={1.5} fill="#FFFFFF" />
          </Svg>
        </Animated.View>

        {[0, 1, 2].map((i) => (
          <CutSlice key={i} p={p} index={i} x={108 + i * 17} y={128} color={color} />
        ))}
      </Animated.View>

      {[-1, 1, -1].map((dir, i) =>
        isMeat ? (
          <JuiceDrop key={i} p={p} dir={dir} index={i} x={CUT_X} y={FOOD_Y} />
        ) : (
          <Crumb key={i} p={p} dir={dir} index={i} x={CUT_X} y={FOOD_Y} color={color} />
        )
      )}

      <Animated.View
        style={[
          { position: 'absolute', left: CUT_X - KNIFE.edgeX, top: 128 - KNIFE.edgeY },
          knife,
        ]}
      >
        <Knife />
      </Animated.View>

      <Animated.View style={[{ position: 'absolute', left: CUT_X - 15, top: 112 }, flash]}>
        <Svg width={30} height={30} viewBox="0 0 30 30">
          <Circle cx={15} cy={15} r={13} fill="#FFFFFF" opacity={0.85} />
        </Svg>
      </Animated.View>

      {goesToPot && <PotHandoff p={p} fromX={CUT_X} fromY={FOOD_Y} name={item} />}
    </View>
  );
}

function CutSlice({
  p,
  index,
  x,
  y,
  color,
}: {
  p: ReturnType<typeof useLoop>;
  index: number;
  x: number;
  y: number;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    const a = seg(p.value, 0.48 + index * 0.025, 0.8 + index * 0.025);
    const hop = Math.sin(a * Math.PI);
    return {
      transform: [{ translateY: -hop * 8 }, { rotate: `${hop * 14}deg` }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x - 9, top: y - 6 }, style]}>
      <SlicePiece size={18} fill={color} />
    </Animated.View>
  );
}

function Crumb({
  p,
  dir,
  index,
  x,
  y,
  color,
}: {
  p: ReturnType<typeof useLoop>;
  dir: number;
  index: number;
  x: number;
  y: number;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    const a = seg(p.value, 0.48, 0.94);
    return {
      opacity: a > 0 && a < 1 ? 1 - a : 0,
      transform: [
        { translateX: dir * (16 + index * 7) * a },
        { translateY: -24 * a + 56 * a * a },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y }, style]}>
      <Dot x={0} y={0} size={6 - index * 0.8} color={color} />
    </Animated.View>
  );
}

// Meat throws juice where a vegetable throws dry crumbs — same flick off the
// blade, but wetter: an elongated drop that tumbles instead of a round speck.
function JuiceDrop({
  p,
  dir,
  index,
  x,
  y,
}: {
  p: ReturnType<typeof useLoop>;
  dir: number;
  index: number;
  x: number;
  y: number;
}) {
  const style = useAnimatedStyle(() => {
    const a = seg(p.value, 0.48, 0.9);
    return {
      opacity: a > 0 && a < 1 ? 1 - a * a : 0,
      transform: [
        { translateX: dir * (13 + index * 6) * a },
        { translateY: -20 * a + 52 * a * a },
        { rotate: `${dir * 60 * a}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y }, style]}>
      <Svg width={7} height={10} viewBox="0 0 7 10">
        <Path d="M3.5 0 C5.6 4 7 6.1 7 7.5 C7 9 5.4 10 3.5 10 C1.6 10 0 9 0 7.5 C0 6.1 1.4 4 3.5 0 Z" fill={MEAT_JUICE} />
      </Svg>
    </Animated.View>
  );
}

// The stain left under the blade once the cut is through — what actually tells
// the eye this is raw meat and not another vegetable.
function JuiceSmear({ p, x, y }: { p: ReturnType<typeof useLoop>; x: number; y: number }) {
  const style = useAnimatedStyle(() => {
    const spread = seg(p.value, 0.48, 0.74);
    const clear = seg(p.value, 0.92, 1);
    return {
      opacity: spread * 0.5 * (1 - clear),
      transform: [{ scaleX: 0.35 + spread * 0.75 }, { scaleY: 0.5 + spread * 0.5 }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x - 13, top: y - 4 }, style]}>
      <Svg width={26} height={9} viewBox="0 0 26 9">
        <Ellipse cx={13} cy={4.5} rx={12} ry={3.6} fill={MEAT_JUICE} />
        <Ellipse cx={21} cy={6} rx={3.4} ry={2} fill={MEAT_JUICE} />
      </Svg>
    </Animated.View>
  );
}

/* ================= board → pot handoff ================= */

const POT_X = 166;
const POT_TOP = 38;
// The broth surface inside the mini pot — where a tossed piece has to land for
// the throw to read as "into the pot" rather than "behind it".
const POT_MOUTH_Y = 48;

// Shown on a chopping step whose next step stirs or simmers: every chop tosses
// the real ingredient across to the waiting pot, so the two steps read as one
// continuous action instead of two unrelated loops.
function PotHandoff({
  p,
  fromX,
  fromY,
  name,
}: {
  p: ReturnType<typeof useLoop>;
  fromX: number;
  fromY: number;
  name?: string;
}) {
  const flight = useAnimatedStyle(() => {
    const a = seg(p.value, 0.58, 0.9);
    return {
      opacity: a > 0 && a < 1 ? 1 : 0,
      transform: [
        { translateX: (POT_X - fromX) * a },
        // Arcs well above the rim before falling in — a flatter throw just
        // slides the piece sideways into the pot instead of dropping into it.
        { translateY: (POT_MOUTH_Y - fromY) * a - Math.sin(a * Math.PI) * 40 },
        { rotate: `${a * 300}deg` },
        { scale: 1 - a * 0.3 },
      ],
    };
  });

  const plop = useAnimatedStyle(() => {
    const s = bell(p.value, 0.88, 1);
    return { opacity: s * 0.9, transform: [{ scale: 0.4 + s }] };
  });

  return (
    <>
      <View style={{ position: 'absolute', left: POT_X - 20, top: POT_TOP }} pointerEvents="none">
        <Svg width={40} height={32} viewBox="0 0 40 32">
          <Rect x={0} y={7} width={9} height={5} rx={2.5} fill={STEEL_DEEP} stroke={INK} strokeWidth={2.2} />
          <Rect x={31} y={7} width={9} height={5} rx={2.5} fill={STEEL_DEEP} stroke={INK} strokeWidth={2.2} />
          <Path
            d="M6 10 H34 L31 25 A5 5 0 0 1 26 29 H14 A5 5 0 0 1 9 25 Z"
            fill={PAN}
            stroke={INK}
            strokeWidth={2.4}
            strokeLinejoin="round"
          />
          <Ellipse cx={20} cy={10} rx={14} ry={4.6} fill={STEEL_DEEP} stroke={INK} strokeWidth={2.4} />
          <Ellipse cx={20} cy={10} rx={10} ry={2.9} fill={BROTH} />
        </Svg>
      </View>

      <Steam x={POT_X} y={POT_MOUTH_Y - 4} size={16} period={2600} />

      <Animated.View style={[{ position: 'absolute', left: fromX - 16, top: fromY - 16 }, flight]}>
        <IngredientBit name={name} size={24} />
      </Animated.View>

      <Animated.View style={[{ position: 'absolute', left: POT_X - 12, top: POT_MOUTH_Y - 7 }, plop]}>
        <Svg width={24} height={14} viewBox="0 0 24 14">
          <Ellipse cx={12} cy={7} rx={10} ry={4.4} fill="none" stroke="#FFFFFF" strokeWidth={2.4} />
        </Svg>
      </Animated.View>
    </>
  );
}

/* ================= pot — stir / simmer / general ================= */

export function PotScene({
  ingredients,
  variant,
  heat: heatLevel,
}: SceneProps & { variant: 'stir' | 'simmer' | 'general'; heat?: HeatLevel | null }) {
  const showSpoon = variant !== 'simmer';
  const heat = flameFor(heatLevel, variant === 'simmer' ? 1.15 : 0.85);
  const breathe = useLoop(3200);

  // What the surface looks like is how a cook tells a simmer from a boil:
  // a few lazy bubbles versus the whole surface rolling. Showing the same
  // bubbles for both taught nothing.
  const bubbles =
    heatLevel === 'high'
      ? [68, 82, 96, 110, 124, 90, 116].map((x, i) => ({ x, size: 11 + (i % 2) * 3, period: 760 + i * 70 }))
      : heatLevel === 'low'
        ? [86, 114].map((x, i) => ({ x, size: 7, period: 2300 + i * 260 }))
        : [74, 92, 110, 126].map((x, i) => ({ x, size: 9 + (i % 2) * 3, period: 1500 + i * 120 }));

  const pot = useAnimatedStyle(() => {
    const s = wobble(breathe.value, 1);
    return { transform: [{ translateY: s * 1.2 }, { scaleX: 1 + s * 0.006 }] };
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      <Counter y={COUNTER_Y} />
      <Burner cx={100} y={158} width={96} intensity={heat} />

      <Animated.View style={[StyleSheet.absoluteFill, pot]}>
        <View style={{ position: 'absolute', left: 10, top: 42 }}>
          <PotBack />
        </View>

        {ingredients.slice(0, 3).map((name, i) => (
          <FloatingChunk
            key={`${name}-${i}`}
            name={name}
            x={[78, 106, 124][i]}
            y={[79, 83, 78][i]}
            delay={i * 420}
          />
        ))}

        {bubbles.map((b, i) => (
          <Bubble key={`${b.x}-${i}`} x={b.x} y={80} delay={i * (b.period / bubbles.length)} size={b.size} period={b.period} />
        ))}

        {showSpoon && <StirSpoon slow={variant === 'general'} />}

        <View style={{ position: 'absolute', left: 10, top: 42 }} pointerEvents="none">
          <PotFront />
        </View>
      </Animated.View>

      <Steam x={76} y={68} delay={0} size={26} />
      <Steam x={100} y={62} delay={800} size={32} />
      <Steam x={124} y={68} delay={1600} size={26} />
    </View>
  );
}

function StirSpoon({ slow }: { slow: boolean }) {
  const p = useLoop(slow ? 2600 : 1500);
  const style = useAnimatedStyle(() => {
    const a = p.value * Math.PI * 2;
    const near = (Math.sin(a) + 1) / 2; // 1 when closest to the viewer
    return {
      transform: [
        { translateX: Math.cos(a) * 24 },
        { translateY: Math.sin(a) * 5 },
        { scale: 0.92 + near * 0.14 },
        { rotate: `${14 + Math.cos(a) * 10}deg` },
      ],
    };
  });
  return (
    <Animated.View
      style={[{ position: 'absolute', left: 100 - SPOON.headX, top: 76 - SPOON.headY }, style]}
    >
      <Spoon />
    </Animated.View>
  );
}

function FloatingChunk({ name, x, y, delay }: { name: string; x: number; y: number; delay: number }) {
  const p = useLoop(2400, delay);
  const style = useAnimatedStyle(() => {
    const t = p.value;
    return {
      transform: [
        { translateY: Math.sin(t * Math.PI * 2) * 2.6 },
        { translateX: Math.cos(t * Math.PI * 2) * 2 },
        { rotate: `${Math.sin(t * Math.PI * 2) * 9}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x - 16, top: y - 16 }, style]}>
      <IngredientBit name={name} size={22} />
    </Animated.View>
  );
}

/* ================= pan — fry / flip ================= */

export function PanScene({
  ingredients,
  variant,
  heat,
}: SceneProps & { variant: 'fry' | 'flip'; heat?: HeatLevel | null }) {
  return variant === 'flip' ? (
    <FlipScene ingredients={ingredients} heat={heat} />
  ) : (
    <FryScene ingredients={ingredients} heat={heat} />
  );
}

function FryScene({ ingredients, heat }: SceneProps & { heat?: HeatLevel | null }) {
  const p = useLoop(900);
  // A slow second clock for doneness: the pieces brown over it and a check
  // pops when they're golden — the "when do I stop?" answer a beginner needs.
  const cook = useLoop(5200);
  const pan = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.abs(Math.sin(p.value * Math.PI * 2)) * 1.1 }],
  }));

  const names = ingredients.length > 0 ? ingredients.slice(0, 3) : [undefined];

  return (
    <View style={StyleSheet.absoluteFill}>
      <Counter y={COUNTER_Y} />
      <Burner cx={100} y={156} width={104} intensity={flameFor(heat, 1.1)} />

      <Animated.View style={[StyleSheet.absoluteFill, pan]}>
        <View style={{ position: 'absolute', left: 0, top: 82 }}>
          <PanArt />
        </View>

        {names.map((name, i) => (
          <SizzlingPiece
            key={`${name ?? 'piece'}-${i}`}
            name={name}
            x={[76, 100, 122][i] ?? 100}
            y={[104, 107, 103][i] ?? 105}
            delay={i * 140}
            cook={cook}
          />
        ))}

        {[68, 88, 112, 132].map((x, i) => (
          <OilPop key={x} x={x} y={104} delay={i * 230} />
        ))}
      </Animated.View>

      <DoneCheck p={cook} x={150} y={70} from={0.72} to={0.94} />

      <Sparkle x={62} y={96} delay={0} size={12} period={900} color="#FFE6A0" />
      <Sparkle x={140} y={100} delay={420} size={11} period={900} color="#FFE6A0" />
      <HeatWave x={78} y={84} delay={0} />
      <HeatWave x={118} y={80} delay={900} />
    </View>
  );
}

function SizzlingPiece({
  name,
  x,
  y,
  delay,
  cook,
}: {
  name?: string;
  x: number;
  y: number;
  delay: number;
  cook: ReturnType<typeof useLoop>;
}) {
  const p = useLoop(360, delay);
  // Sear stripes darken in across the cook, then clear for the next round.
  const sear = useAnimatedStyle(() => ({
    opacity: seg(cook.value, 0.12, 0.7) * (1 - seg(cook.value, 0.94, 1)),
  }));
  const style = useAnimatedStyle(() => {
    const t = p.value;
    return {
      transform: [
        { translateX: Math.sin(t * Math.PI * 2) * 1.4 },
        { translateY: -Math.abs(Math.sin(t * Math.PI * 2)) * 2 },
        { rotate: `${Math.sin(t * Math.PI * 2) * 5}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x - 16, top: y - 16 }, style]}>
      <IngredientBit name={name} size={28} />
      <Animated.View style={[StyleSheet.absoluteFill, sear]} pointerEvents="none">
        <Svg width={32} height={32} viewBox="0 0 32 32">
          <Path
            d="M9 14 L21 10 M10 20 L23 16"
            stroke="#6B3312"
            strokeWidth={3}
            strokeLinecap="round"
            opacity={0.85}
          />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

// A green tick that pops in when the food reaches the state the step is after.
function DoneCheck({
  p,
  x,
  y,
  from,
  to,
}: {
  p: ReturnType<typeof useLoop>;
  x: number;
  y: number;
  from: number;
  to: number;
}) {
  const style = useAnimatedStyle(() => {
    const on = seg(p.value, from, from + 0.06);
    const off = seg(p.value, to, to + 0.04);
    const pop = bell(p.value, from, from + 0.1);
    return { opacity: on * (1 - off), transform: [{ scale: 0.4 + on * 0.6 + pop * 0.25 }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x - 13, top: y - 13 }, style]}>
      <Svg width={26} height={26} viewBox="0 0 26 26">
        <Circle cx={13} cy={13} r={11.5} fill="#3DA35D" stroke={INK} strokeWidth={2.2} />
        <Path d="M7.5 13.5 L11.5 17.2 L18.5 9.5" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Animated.View>
  );
}

function OilPop({ x, y, delay }: { x: number; y: number; delay: number }) {
  const p = useLoop(820, delay);
  const style = useAnimatedStyle(() => {
    const t = p.value;
    const a = seg(t, 0, 0.8);
    return {
      opacity: a > 0 && a < 1 ? 1 - a : 0,
      transform: [{ translateY: -18 * a + 26 * a * a }, { scale: 0.6 + (1 - a) * 0.5 }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y }, style]}>
      <Dot x={0} y={0} size={5} color="#FFD98A" />
    </Animated.View>
  );
}

function FlipScene({ ingredients, heat }: SceneProps & { heat?: HeatLevel | null }) {
  const p = useLoop(1900);
  const name = ingredients[0];

  // Dip to load the flick, snap up, then catch and absorb the landing.
  const pan = useAnimatedStyle(() => {
    const t = p.value;
    const dip = bell(t, 0, 0.2);
    const flick = bell(t, 0.2, 0.3);
    const cushion = bell(t, 0.84, 0.96);
    return {
      transform: [
        { translateY: dip * 3 - flick * 5 + cushion * 4 },
        { rotate: `${-3 * dip + 9 * flick - 2 * cushion}deg` },
      ],
    };
  });

  const food = useAnimatedStyle(() => {
    const t = p.value;
    const a = seg(t, 0.22, 0.86);
    const land = bell(t, 0.86, 0.98);
    return {
      transform: [
        { translateX: Math.sin(a * Math.PI) * 7 },
        { translateY: -Math.sin(a * Math.PI) * 64 },
        { rotate: `${a * 360}deg` },
        { scaleY: 1 - land * 0.3 },
        { scaleX: 1 + land * 0.22 },
      ],
    };
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      <Counter y={COUNTER_Y} />
      <Burner cx={100} y={156} width={104} intensity={flameFor(heat, 1)} />

      <Animated.View style={[StyleSheet.absoluteFill, pan]}>
        <View style={{ position: 'absolute', left: 0, top: 82 }}>
          <PanArt />
        </View>
      </Animated.View>

      <Animated.View style={[{ position: 'absolute', left: 100 - 16, top: 104 - 16 }, food]}>
        <IngredientBit name={name} size={32} />
      </Animated.View>

      <Sparkle x={72} y={48} delay={620} size={14} period={1900} />
      <Sparkle x={130} y={56} delay={760} size={12} period={1900} />
      <HeatWave x={82} y={86} delay={300} />
    </View>
  );
}

/* ================= pouring ================= */

export function PourScene({ ingredients }: SceneProps) {
  const p = useLoop(2600);
  const liquid = ingredientColor(ingredients[0]);

  // The jug art is already drawn tipped, so this only deepens the pour a little.
  const jug = useAnimatedStyle(() => {
    const t = p.value;
    const tilt = easeOut(seg(t, 0, 0.22)) - easeIn(seg(t, 0.8, 1));
    return { transform: [{ scale: 0.62 }, { rotate: `${9 * tilt}deg` }] };
  });

  const stream = useAnimatedStyle(() => {
    const t = p.value;
    const on = seg(t, 0.24, 0.32) - seg(t, 0.74, 0.82);
    return {
      opacity: on,
      transform: [{ scaleY: 0.6 + on * 0.4 }, { translateX: wobble(t, 9) * 1.2 }],
    };
  });

  const level = useAnimatedStyle(() => {
    const fill = seg(p.value, 0.3, 0.78);
    return { transform: [{ scale: 0.45 + fill * 0.55 }] };
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      <Counter y={COUNTER_Y} />

      <View style={{ position: 'absolute', left: 15, top: 72 }}>
        <BowlBack fill={liquid} />
      </View>

      <Animated.View style={[{ position: 'absolute', left: 40, top: 87 }, level]}>
        <Svg width={120} height={24} viewBox="0 0 120 24">
          <Ellipse cx={60} cy={12} rx={58} ry={10} fill={liquid} />
        </Svg>
      </Animated.View>

      <Animated.View style={[{ position: 'absolute', left: 83, top: 72 }, stream]}>
        <Svg width={10} height={28} viewBox="0 0 10 28">
          <Path d="M4 0 C2 9 7 18 5 28 L1 28 C0 18 2 9 3 0 Z" fill={liquid} opacity={0.95} />
        </Svg>
      </Animated.View>

      {[0, 1, 2].map((i) => (
        <Droplet key={i} p={p} index={i} x={86} color={liquid} />
      ))}

      <Splash p={p} x={88} y={97} color={liquid} />

      <View style={{ position: 'absolute', left: 15, top: 72 }} pointerEvents="none">
        <BowlFront />
      </View>

      <Animated.View style={[{ position: 'absolute', left: -2, top: 4 }, jug]}>
        <Jug />
      </Animated.View>
    </View>
  );
}

function Droplet({
  p,
  index,
  x,
  color,
}: {
  p: ReturnType<typeof useLoop>;
  index: number;
  x: number;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    const a = seg(p.value, 0.34 + index * 0.13, 0.62 + index * 0.13);
    return {
      opacity: a > 0 && a < 1 ? 1 : 0,
      transform: [{ translateY: easeIn(a) * 24 }, { scaleY: 1 + a * 0.5 }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: 74 }, style]}>
      <Dot x={0} y={0} size={6} color={color} />
    </Animated.View>
  );
}

function Splash({
  p,
  x,
  y,
  color,
}: {
  p: ReturnType<typeof useLoop>;
  x: number;
  y: number;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    const t = p.value;
    const active = t > 0.34 && t < 0.8 ? 1 : 0;
    const ring = (t * 6) % 1;
    return {
      opacity: active * (1 - ring) * 0.8,
      transform: [{ scale: 0.4 + ring * 1.1 }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x - 20, top: y - 7 }, style]}>
      <Svg width={40} height={14} viewBox="0 0 40 14">
        <Ellipse cx={20} cy={7} rx={17} ry={5} fill="none" stroke={color} strokeWidth={2.6} />
      </Svg>
    </Animated.View>
  );
}

/* ================= mixing bowl — whisk / fold ================= */

export function BowlScene({ ingredients, variant }: SceneProps & { variant: 'whisk' | 'fold' }) {
  const swirl = useLoop(variant === 'whisk' ? 1100 : 3000);

  // Flour and sugar go in as dry powder — they shower down off the bag and
  // raise dust, where a wet ingredient just sits bobbing in the batter. The
  // bowl showed neither before, so mixing a cake was an empty bowl of colour.
  const powder = ingredients.find((name) => {
    const c = categorizeIngredient(name);
    return c === 'grain' || c === 'sweet';
  });
  const wet = ingredients.filter((name) => name !== powder).slice(0, 2);
  const batter = ingredientColor(wet[0] ?? ingredients[0]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Counter y={COUNTER_Y} />

      <View style={{ position: 'absolute', left: 15, top: 72 }}>
        <BowlBack fill={batter} />
      </View>

      <Swirl p={swirl} y={98} color="#FFFFFF" />

      {wet.map((name, i) => (
        <FloatingChunk key={`${name}-${i}`} name={name} x={[84, 118][i]} y={[99, 96][i]} delay={i * 520} />
      ))}

      {variant === 'whisk' &&
        [82, 100, 118].map((x, i) => (
          <Bubble key={x} x={x} y={96} delay={i * 300} size={8} period={1200} color="#FFF3D6" />
        ))}

      {variant === 'whisk' ? <WhiskTool /> : <FoldTool />}

      <View style={{ position: 'absolute', left: 15, top: 72 }} pointerEvents="none">
        <BowlFront />
      </View>

      {powder && <PowderPour name={powder} x={54} y={36} landX={74} landY={94} />}
    </View>
  );
}

// The bag tips over the bowl, grains shower down the gap, and the surface
// puffs where they land — kept clear of the whisk's orbit on the right.
function PowderPour({
  name,
  x,
  y,
  landX,
  landY,
}: {
  name: string;
  x: number;
  y: number;
  landX: number;
  landY: number;
}) {
  const p = useLoop(2400);
  const startX = x + 6;
  const startY = y + 12;

  const tip = useAnimatedStyle(() => {
    const over = easeOut(seg(p.value, 0.05, 0.28)) - easeIn(seg(p.value, 0.74, 0.96));
    return { transform: [{ rotate: `${over * 46}deg` }, { translateX: over * 5 }] };
  });

  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <PowderGrain
          key={i}
          p={p}
          index={i}
          x={startX}
          y={startY}
          dx={landX - startX}
          dy={landY - startY}
        />
      ))}

      {[-1, 0, 1].map((dir, i) => (
        <PuffCloud key={i} p={p} dir={dir} index={i} x={landX} y={landY} />
      ))}

      <Animated.View style={[{ position: 'absolute', left: x - 16, top: y - 16 }, tip]}>
        <IngredientBit name={name} size={30} />
      </Animated.View>
    </>
  );
}

function PowderGrain({
  p,
  index,
  x,
  y,
  dx,
  dy,
}: {
  p: ReturnType<typeof useLoop>;
  index: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
}) {
  const style = useAnimatedStyle(() => {
    const a = seg(p.value, 0.26 + index * 0.05, 0.64 + index * 0.05);
    return {
      opacity: a > 0 && a < 0.94 ? 0.95 : 0,
      transform: [
        { translateX: dx * a + (index - 2) * 2.4 },
        { translateY: easeIn(a) * dy },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y }, style]}>
      <Svg width={5} height={5} viewBox="0 0 5 5">
        <Circle cx={2.5} cy={2.5} r={2.2} fill="#FFFFFF" stroke="#E3DAC6" strokeWidth={0.8} />
      </Svg>
    </Animated.View>
  );
}

function PuffCloud({
  p,
  dir,
  index,
  x,
  y,
}: {
  p: ReturnType<typeof useLoop>;
  dir: number;
  index: number;
  x: number;
  y: number;
}) {
  const style = useAnimatedStyle(() => {
    const a = seg(p.value, 0.48 + index * 0.04, 0.9 + index * 0.04);
    return {
      opacity: a > 0 && a < 1 ? Math.sin(a * Math.PI) * 0.5 : 0,
      transform: [{ translateX: dir * 17 * a }, { translateY: -11 * a }, { scale: 0.35 + a * 1.05 }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x - 9, top: y - 9 }, style]}>
      <Svg width={18} height={18} viewBox="0 0 18 18">
        <Circle cx={9} cy={9} r={8} fill="#FFFFFF" />
      </Svg>
    </Animated.View>
  );
}

function Swirl({ p, y, color }: { p: ReturnType<typeof useLoop>; y: number; color: string }) {
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${p.value * 360}deg` }],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', left: 100 - 50, top: y - 12 }, style]}>
      <Svg width={100} height={24} viewBox="0 0 100 24">
        <Path
          d="M14 12 A36 8 0 0 1 86 12"
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          opacity={0.5}
        />
      </Svg>
    </Animated.View>
  );
}

function WhiskTool() {
  const p = useLoop(700);
  const style = useAnimatedStyle(() => {
    const a = p.value * Math.PI * 2;
    return {
      transform: [
        { translateX: Math.cos(a) * 16 },
        { translateY: Math.sin(a) * 5 },
        { rotate: `${Math.cos(a) * 11}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 100 - WHISK.headX, top: 94 - WHISK.headY }, style]}>
      <Whisk />
    </Animated.View>
  );
}

function FoldTool() {
  const p = useLoop(2800);
  const style = useAnimatedStyle(() => {
    const t = p.value;
    const down = easeInOut(seg(t, 0.08, 0.5));
    const up = easeInOut(seg(t, 0.55, 0.92));
    const sweep = down - up;
    return {
      transform: [
        { translateX: 20 - sweep * 40 },
        { translateY: sweep * 8 },
        { rotate: `${22 - sweep * 128}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 100 - 27, top: 100 - 81 }, style]}>
      <Spatula />
    </Animated.View>
  );
}

/* ================= seasoning ================= */

export function SeasonScene({ ingredients }: SceneProps) {
  const p = useLoop(1500);
  const dish = ingredientColor(ingredients[0]);

  const shaker = useAnimatedStyle(() => {
    const t = p.value;
    const shake = Math.sin(seg(t, 0.1, 0.7) * Math.PI * 6) * bell(t, 0.05, 0.8);
    return {
      // The shaker art has its cap at the top, so it's flipped ~180° to pour
      // the salt down onto the food, tilted 22° and shaken around that.
      transform: [{ rotate: `${158 + shake * 14}deg` }, { translateY: shake * 2 }],
    };
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      <Counter y={COUNTER_Y} />

      <View style={{ position: 'absolute', left: 10, top: 112 }}>
        <Plate />
      </View>
      <View style={{ position: 'absolute', left: 40, top: 100 }}>
        <FoodMound fill={dish} />
      </View>

      {Array.from({ length: 9 }).map((_, i) => (
        <Grain key={i} p={p} index={i} />
      ))}

      <Animated.View style={[{ position: 'absolute', left: 62, top: 8 }, shaker]}>
        <Shaker />
      </Animated.View>

      <Sparkle x={100} y={140} delay={700} size={13} period={1500} color="#FFFFFF" />
    </View>
  );
}

function Grain({ p, index }: { p: ReturnType<typeof useLoop>; index: number }) {
  const spread = (index - 4) * 6;
  const style = useAnimatedStyle(() => {
    const a = seg(p.value, 0.16 + index * 0.035, 0.78 + index * 0.02);
    return {
      opacity: a > 0 && a < 0.92 ? 1 : 0,
      transform: [{ translateX: spread * a }, { translateY: easeIn(a) * 34 }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 108, top: 118 }, style]}>
      <Svg width={5} height={5} viewBox="0 0 5 5">
        <Circle cx={2.5} cy={2.5} r={2.2} fill="#FFFFFF" stroke={INK} strokeWidth={0.8} />
      </Svg>
    </Animated.View>
  );
}

/* ================= oven ================= */

// By the time a recipe reaches its baking step the ingredients are already a
// dough, so this scene shows dough rather than the raw items that made it.
export function BakeScene() {
  const p = useLoop(3200);
  const glow = useAnimatedStyle(() => ({ opacity: 0.45 + (wobble(p.value, 1) + 1) / 2 * 0.4 }));
  const knob = useAnimatedStyle(() => ({ transform: [{ rotate: `${-40 + p.value * 80}deg` }] }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <Counter y={COUNTER_Y} />

      <View style={{ position: 'absolute', left: 25, top: 26 }}>
        <OvenBody />
      </View>

      <Animated.View style={[{ position: 'absolute', left: 50, top: 92 }, glow]} pointerEvents="none">
        <Svg width={100} height={54} viewBox="0 0 100 54">
          <Rect x={0} y={0} width={100} height={54} rx={8} fill="#FFB020" />
        </Svg>
      </Animated.View>

      <View style={{ position: 'absolute', left: 55, top: 138 }}>
        <Svg width={90} height={10} viewBox="0 0 90 10">
          <Rect x={0} y={2} width={90} height={6} rx={3} fill="#9AA4B0" stroke={INK} strokeWidth={2} />
        </Svg>
      </View>

      {[70, 100, 130].map((x, i) => (
        <DoughRound key={x} x={x} y={138} delay={i * 700} />
      ))}

      <Animated.View style={[{ position: 'absolute', left: 46, top: 45 }, knob]}>
        <Svg width={14} height={14} viewBox="0 0 14 14">
          <Circle cx={7} cy={7} r={6} fill="#F0F4F7" stroke={INK} strokeWidth={2} />
          <Path d="M7 7 V3" stroke={INK} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      </Animated.View>

      <Sparkle x={142} y={40} delay={1200} size={13} period={3200} />
    </View>
  );
}

// Puffs up and browns across the loop. `y` is the rack line the dough sits on:
// the upward shift cancels the downward half of the centre-origin scale, so it
// grows off the rack instead of sinking through it.
function DoughRound({ x, y, delay }: { x: number; y: number; delay: number }) {
  const p = useLoop(4200, delay);

  const body = useAnimatedStyle(() => {
    const rise = easeOut(seg(p.value, 0, 0.62));
    return {
      transform: [
        { translateY: -rise * 4 },
        { scaleY: 0.72 + rise * 0.34 + wobble(p.value, 2) * 0.012 },
        { scaleX: 0.92 + rise * 0.12 },
      ],
    };
  });

  // The golden crust fades in over the pale dough underneath — cheaper and
  // steadier than animating an SVG fill.
  const crust = useAnimatedStyle(() => ({ opacity: seg(p.value, 0.34, 0.92) }));

  return (
    <Animated.View style={[{ position: 'absolute', left: x - 15, top: y - 20 }, body]}>
      <Svg width={30} height={22} viewBox="0 0 30 22">
        <Path d="M2 20 C2 6 28 6 28 20 Z" fill="#F0DFBE" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, crust]}>
        <Svg width={30} height={22} viewBox="0 0 30 22">
          <Path d="M2 20 C2 6 28 6 28 20 Z" fill="#D69A4A" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
          <Path d="M9 13 C12 10 18 10 21 13" stroke="#B06F2C" strokeWidth={1.8} strokeLinecap="round" fill="none" opacity={0.55} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

/* ================= plating up ================= */

export function ServeScene({ ingredients }: SceneProps) {
  const p = useLoop(3000);
  const dish = ingredientColor(ingredients[0]);

  const bob = useAnimatedStyle(() => {
    const s = wobble(p.value, 1);
    return { transform: [{ translateY: s * 2 }] };
  });

  const leaf = useAnimatedStyle(() => ({ transform: [{ rotate: `${wobble(p.value, 1) * 7}deg` }] }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <Counter y={COUNTER_Y} />

      <Animated.View style={[StyleSheet.absoluteFill, bob]}>
        <View style={{ position: 'absolute', left: 10, top: 118 }}>
          <Plate />
        </View>
        <View style={{ position: 'absolute', left: 40, top: 104 }}>
          <FoodMound fill={dish} />
        </View>

        {ingredients.slice(0, 2).map((name, i) => (
          <View key={`${name}-${i}`} style={{ position: 'absolute', left: [84, 110][i] - 16, top: [112, 108][i] - 16 }}>
            <IngredientBit name={name} size={22} />
          </View>
        ))}

        <Animated.View style={[{ position: 'absolute', left: 116, top: 100 }, leaf]}>
          <Leaf size={24} />
        </Animated.View>
      </Animated.View>

      <Steam x={86} y={96} delay={0} size={24} />
      <Steam x={112} y={92} delay={1100} size={22} />

      <Sparkle x={44} y={112} delay={0} size={14} period={2400} />
      <Sparkle x={156} y={104} delay={600} size={12} period={2400} />
      <Sparkle x={68} y={80} delay={1200} size={11} period={2400} />
      <Sparkle x={136} y={76} delay={1800} size={13} period={2400} />
    </View>
  );
}

/* ================= adding ingredients ================= */

export type Vessel = 'pot' | 'pan' | 'bowl';

// Where a dropped piece comes to rest in each vessel, and the spread of the
// landing spots so several ingredients never pile onto one point.
const VESSEL: Record<Vessel, { landY: number; xs: number[] }> = {
  pot: { landY: 80, xs: [80, 102, 122] },
  pan: { landY: 105, xs: [74, 98, 122] },
  bowl: { landY: 97, xs: [80, 102, 122] },
};

const DROP_START_Y = 34;
const ORDER_RED = '#E4572E';

// Each ingredient hovers above the vessel with its number, then drops in —
// one after another — so the scene shows both what goes in and in what order.
export function AddScene({
  ingredients,
  vessel = 'pot',
  heat,
}: SceneProps & { vessel?: Vessel; heat?: HeatLevel | null }) {
  const items: (string | undefined)[] = ingredients.length > 0 ? ingredients.slice(0, 3) : [undefined];
  const n = items.length;
  const p = useLoop(1300 * n + 900);
  const v = VESSEL[vessel];
  const onStove = vessel !== 'bowl';

  return (
    <View style={StyleSheet.absoluteFill}>
      <Counter y={COUNTER_Y} />
      {onStove && (
        <Burner
          cx={100}
          y={vessel === 'pan' ? 156 : 158}
          width={vessel === 'pan' ? 104 : 96}
          intensity={flameFor(heat, 0.85)}
        />
      )}

      {vessel === 'pot' && (
        <View style={{ position: 'absolute', left: 10, top: 42 }}>
          <PotBack />
        </View>
      )}
      {vessel === 'pan' && (
        <View style={{ position: 'absolute', left: 0, top: 82 }}>
          <PanArt />
        </View>
      )}
      {vessel === 'bowl' && (
        <View style={{ position: 'absolute', left: 15, top: 72 }}>
          <BowlBack fill={ingredientColor(items[0])} />
        </View>
      )}

      {items.map((name, i) => (
        <DropIn key={`${name ?? 'item'}-${i}`} p={p} n={n} index={i} name={name} x={v.xs[i]} landY={v.landY} />
      ))}

      {vessel === 'pot' && (
        <View style={{ position: 'absolute', left: 10, top: 42 }} pointerEvents="none">
          <PotFront />
        </View>
      )}
      {vessel === 'bowl' && (
        <View style={{ position: 'absolute', left: 15, top: 72 }} pointerEvents="none">
          <BowlFront />
        </View>
      )}

      {items.map((_, i) => (
        <LandSplash key={i} p={p} n={n} index={i} x={v.xs[i]} y={v.landY + 2} />
      ))}

      {vessel === 'pot' && <Steam x={70} y={70} delay={400} size={22} />}
      {vessel === 'pan' && <HeatWave x={140} y={88} delay={0} />}
    </View>
  );
}

// Timeline slice for ingredient `index` of `n`: appear → hover → fall → float.
function dropWindow(n: number, index: number) {
  'worklet';
  const w = 0.9 / n;
  const s = index * w;
  return { s, appear: s + 0.25 * w, hoverEnd: s + 0.45 * w, land: s + 0.75 * w, w };
}

function DropIn({
  p,
  n,
  index,
  name,
  x,
  landY,
}: {
  p: ReturnType<typeof useLoop>;
  n: number;
  index: number;
  name?: string;
  x: number;
  landY: number;
}) {
  const body = useAnimatedStyle(() => {
    const t = p.value;
    const d = dropWindow(n, index);
    const shown = seg(t, d.s, d.appear);
    const hover = seg(t, d.appear, d.hoverEnd);
    const fall = easeIn(seg(t, d.hoverEnd, d.land));
    const landed = t >= d.land;
    const squash = bell(t, d.land, d.land + 0.1 * d.w);
    const fade = seg(t, 0.93, 1);
    const hoverWiggle = hover > 0 && hover < 1 ? Math.sin(hover * Math.PI * 2) * 6 : 0;
    const float = landed ? Math.sin((t - d.land) * Math.PI * 7) * 1.6 : 0;
    return {
      opacity: shown * (1 - fade),
      transform: [
        { translateY: DROP_START_Y + (landY - DROP_START_Y) * fall + float + squash * 2 },
        { rotate: `${hoverWiggle + fall * 40}deg` },
        { scale: 0.6 + shown * 0.4 - fall * 0.12 },
        { scaleY: 1 - squash * 0.22 },
      ],
    };
  });

  // The step number rides beside the ingredient while it waits its turn.
  const badge = useAnimatedStyle(() => {
    const t = p.value;
    const d = dropWindow(n, index);
    const on = seg(t, d.s, d.appear);
    const off = seg(t, d.hoverEnd - 0.04 * d.w, d.hoverEnd + 0.06 * d.w);
    return { opacity: on * (1 - off), transform: [{ scale: 0.5 + on * 0.5 }] };
  });

  // A small arrow under the hovering piece points the way in.
  const arrow = useAnimatedStyle(() => {
    const t = p.value;
    const d = dropWindow(n, index);
    const on = bell(t, d.s + 0.15 * d.w, d.hoverEnd + 0.05 * d.w);
    return { opacity: on, transform: [{ translateY: on * 3 }] };
  });

  return (
    <>
      <Animated.View style={[{ position: 'absolute', left: x - 16, top: -16 }, body]}>
        <IngredientBit name={name} size={30} />
      </Animated.View>

      <Animated.View style={[{ position: 'absolute', left: x - 7, top: DROP_START_Y + 17 }, arrow]}>
        <Svg width={14} height={14} viewBox="0 0 14 14">
          <Path d="M7 1 V12 M2.5 7.5 L7 12 L11.5 7.5" fill="none" stroke={ORDER_RED} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.orderBadge, { left: x + 9, top: DROP_START_Y - 22 }, badge]}>
        <Text style={styles.orderText}>{index + 1}</Text>
      </Animated.View>
    </>
  );
}

function LandSplash({
  p,
  n,
  index,
  x,
  y,
}: {
  p: ReturnType<typeof useLoop>;
  n: number;
  index: number;
  x: number;
  y: number;
}) {
  const style = useAnimatedStyle(() => {
    const d = dropWindow(n, index);
    const s = seg(p.value, d.land, d.land + 0.22 * d.w);
    return { opacity: s > 0 && s < 1 ? (1 - s) * 0.9 : 0, transform: [{ scale: 0.4 + s * 1.1 }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x - 14, top: y - 6 }, style]}>
      <Svg width={28} height={12} viewBox="0 0 28 12">
        <Ellipse cx={14} cy={6} rx={12} ry={4.4} fill="none" stroke="#FFFFFF" strokeWidth={2.4} />
      </Svg>
    </Animated.View>
  );
}

/* ================= washing ================= */

// Tap water runs over the ingredient in a colander, the dirt washes out the
// bottom with the drips, and the clean piece sparkles once the tap is off.
export function WashScene({ ingredients }: SceneProps) {
  const p = useLoop(3400);
  const items: (string | undefined)[] = ingredients.length > 0 ? ingredients.slice(0, 2) : [undefined];
  const xs = items.length === 1 ? [100] : [88, 116];

  const stream = useAnimatedStyle(() => {
    const t = p.value;
    const on = seg(t, 0.04, 0.12) - seg(t, 0.7, 0.78);
    return { opacity: on * 0.9, transform: [{ translateX: wobble(t, 11) * 0.8 }, { scaleX: 0.7 + on * 0.3 }] };
  });

  const splash = useAnimatedStyle(() => {
    const t = p.value;
    const on = t > 0.1 && t < 0.74 ? 1 : 0;
    const ring = (t * 7) % 1;
    return { opacity: on * (1 - ring) * 0.85, transform: [{ scale: 0.4 + ring }] };
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      <Counter y={COUNTER_Y} />

      <Tap />

      <View style={{ position: 'absolute', left: 30, top: 88 }}>
        <ColanderBack />
      </View>

      {items.map((name, i) => (
        <RinsedPiece key={`${name ?? 'item'}-${i}`} p={p} name={name} x={xs[i]} y={98} index={i} />
      ))}

      <View style={{ position: 'absolute', left: 30, top: 88 }} pointerEvents="none">
        <ColanderFront />
      </View>

      <Animated.View style={[{ position: 'absolute', left: 102, top: 42 }, stream]}>
        <Svg width={10} height={56} viewBox="0 0 10 56">
          <Path d="M3 0 C1.5 18 6 36 3.5 56 L7.5 56 C9.5 36 5 18 7 0 Z" fill={WATER} />
        </Svg>
      </Animated.View>

      <Animated.View style={[{ position: 'absolute', left: 107 - 16, top: 96 - 6 }, splash]}>
        <Svg width={32} height={12} viewBox="0 0 32 12">
          <Ellipse cx={16} cy={6} rx={14} ry={4.6} fill="none" stroke={WATER} strokeWidth={2.4} />
        </Svg>
      </Animated.View>

      {[84, 100, 116].map((x, i) => (
        <Drip key={x} p={p} x={x} index={i} />
      ))}

      <CleanSparkle p={p} x={xs[0] - 14} y={84} delay={0} />
      <CleanSparkle p={p} x={(xs[1] ?? xs[0]) + 14} y={80} delay={0.05} />
    </View>
  );
}

function Tap() {
  return (
    <View style={{ position: 'absolute', left: 96, top: 8 }} pointerEvents="none">
      <Svg width={110} height={40} viewBox="0 0 110 40">
        <Rect x={10} y={10} width={104} height={12} rx={6} fill={STEEL_DEEP} stroke={INK} strokeWidth={3} />
        <Rect x={4} y={10} width={14} height={26} rx={5} fill={STEEL} stroke={INK} strokeWidth={3} />
        <Rect x={40} y={1} width={18} height={10} rx={3} fill="#5FA8D3" stroke={INK} strokeWidth={2.6} />
      </Svg>
    </View>
  );
}

// Colander in a 140x70 box; the rim's centre lands at (100, 100) in the scene.
function ColanderBack() {
  const holes = [
    [40, 30], [55, 35], [70, 37], [85, 35], [100, 30],
    [48, 45], [63, 49], [78, 49], [93, 45],
  ];
  return (
    <Svg width={140} height={70} viewBox="0 0 140 70">
      <Rect x={52} y={56} width={36} height={9} rx={4} fill={STEEL_DEEP} stroke={INK} strokeWidth={3} />
      <Rect x={0} y={7} width={18} height={9} rx={4.5} fill={STEEL_DEEP} stroke={INK} strokeWidth={2.6} />
      <Rect x={122} y={7} width={18} height={9} rx={4.5} fill={STEEL_DEEP} stroke={INK} strokeWidth={2.6} />
      <Path d="M10 12 C10 44 36 60 70 60 C104 60 130 44 130 12" fill={STEEL} stroke={INK} strokeWidth={3.4} />
      {holes.map(([cx, cy]) => (
        <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.4} fill="#8595A3" />
      ))}
      <Ellipse cx={70} cy={12} rx={60} ry={11} fill={STEEL_DEEP} stroke={INK} strokeWidth={3.4} />
      <Ellipse cx={70} cy={13} rx={50} ry={7.5} fill="#9FB2C2" />
    </Svg>
  );
}

function ColanderFront() {
  return (
    <Svg width={140} height={70} viewBox="0 0 140 70">
      <Path d="M10 12 A60 11 0 0 0 130 12" fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" />
      <Path d="M10 12 A60 11 0 0 0 130 12" fill="none" stroke={STEEL_DEEP} strokeWidth={4} strokeLinecap="round" />
    </Svg>
  );
}

const DIRT = '#7A5A3A';
const DIRT_SPOTS = [
  [-7, -5],
  [6, -2],
  [-2, 6],
];

function RinsedPiece({
  p,
  name,
  x,
  y,
  index,
}: {
  p: ReturnType<typeof useLoop>;
  name?: string;
  x: number;
  y: number;
  index: number;
}) {
  // Tumbles under the running water, then settles once the tap is off.
  const body = useAnimatedStyle(() => {
    const t = p.value;
    const under = seg(t, 0.08, 0.14) * (1 - seg(t, 0.7, 0.8));
    return {
      transform: [
        { translateY: Math.sin(t * Math.PI * 16 + index) * 2 * under },
        { rotate: `${Math.sin(t * Math.PI * 10 + index * 2) * 10 * under}deg` },
      ],
    };
  });
  return (
    <>
      <Animated.View style={[{ position: 'absolute', left: x - 16, top: y - 16 }, body]}>
        <IngredientBit name={name} size={28} />
      </Animated.View>
      {DIRT_SPOTS.map(([dx, dy], j) => (
        <DirtSpeck key={j} p={p} x={x + dx} y={y + dy} order={index * 3 + j} />
      ))}
    </>
  );
}

function DirtSpeck({ p, x, y, order }: { p: ReturnType<typeof useLoop>; x: number; y: number; order: number }) {
  const style = useAnimatedStyle(() => {
    const t = p.value;
    const wash = seg(t, 0.16 + order * 0.05, 0.46 + order * 0.05);
    const back = seg(t, 0.96, 1);
    return {
      opacity: Math.max(1 - wash, back),
      transform: [{ translateY: wash * 46 * (1 - back) }],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x - 2.5, top: y - 2.5 }, style]}>
      <Svg width={5} height={5} viewBox="0 0 5 5">
        <Circle cx={2.5} cy={2.5} r={2.3} fill={DIRT} />
      </Svg>
    </Animated.View>
  );
}

function Drip({ p, x, index }: { p: ReturnType<typeof useLoop>; x: number; index: number }) {
  const style = useAnimatedStyle(() => {
    const t = p.value;
    const on = t > 0.12 && t < 0.86 ? 1 : 0;
    const a = (t * 5 + index * 0.37) % 1;
    return { opacity: on * (1 - a * a), transform: [{ translateY: easeIn(a) * 20 }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x - 2.5, top: 144 }, style]}>
      <Svg width={5} height={7} viewBox="0 0 5 7">
        <Path d="M2.5 0 C4 3 5 4.4 5 5.2 C5 6.3 3.9 7 2.5 7 C1.1 7 0 6.3 0 5.2 C0 4.4 1 3 2.5 0 Z" fill={WATER} />
      </Svg>
    </Animated.View>
  );
}

function CleanSparkle({ p, x, y, delay }: { p: ReturnType<typeof useLoop>; x: number; y: number; delay: number }) {
  const style = useAnimatedStyle(() => {
    const s = bell(p.value, 0.78 + delay, 0.97);
    return { opacity: s, transform: [{ scale: 0.3 + s * 0.9 }, { rotate: `${s * 90}deg` }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x - 8, top: y - 8 }, style]}>
      <Svg width={16} height={16} viewBox="0 0 24 24">
        <Path
          d="M12 0 C13.4 8.4 15.6 10.6 24 12 C15.6 13.4 13.4 15.6 12 24 C10.6 15.6 8.4 13.4 0 12 C8.4 10.6 10.6 8.4 12 0 Z"
          fill="#FFD34E"
        />
      </Svg>
    </Animated.View>
  );
}

/* ================= waiting — cover / rest / marinate ================= */

// "Cover and cook", "let it rest", "marinate 20 minutes": the action is to
// leave it alone. A timer that runs and rings says that better than any
// moving spoon, and the lid rattling says "the heat is still on".
export function RestScene({
  ingredients,
  onStove,
  heat,
  timerLabel,
}: SceneProps & { onStove: boolean; heat?: HeatLevel | null; timerLabel?: string | null }) {
  const p = useLoop(4200);
  const items = ingredients.slice(0, 2);

  const lid = useAnimatedStyle(() => {
    const t = p.value;
    const rattle = bell(t, 0.3, 0.36) + bell(t, 0.62, 0.68);
    return { transform: [{ translateY: -3 * rattle }, { rotate: `${Math.sin(t * Math.PI * 40) * 2.2 * rattle}deg` }] };
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      <Counter y={COUNTER_Y} />

      {onStove ? (
        <>
          <Burner cx={100} y={158} width={96} intensity={flameFor(heat, 0.55)} />
          <View style={{ position: 'absolute', left: 10, top: 42 }}>
            <PotBack />
          </View>
          <Animated.View style={[{ position: 'absolute', left: 10, top: 42 }, lid]}>
            <Lid />
          </Animated.View>
          <LidPuff p={p} x={36} y={78} />
          <LidPuff p={p} x={150} y={72} />
        </>
      ) : (
        <>
          <View style={{ position: 'absolute', left: 15, top: 72 }}>
            <BowlBack fill={ingredientColor(items[0])} />
          </View>
          {items.map((name, i) => (
            <FloatingChunk key={`${name}-${i}`} name={name} x={[86, 116][i]} y={[99, 96][i]} delay={i * 700} />
          ))}
          <View style={{ position: 'absolute', left: 15, top: 72 }} pointerEvents="none">
            <BowlFront />
          </View>
        </>
      )}

      <KitchenTimer p={p} x={166} y={36} label={timerLabel} />
    </View>
  );
}

// Lid in the pot's own 180x120 box, so it sits exactly on the rim.
function Lid() {
  return (
    <Svg width={180} height={120} viewBox="0 0 180 120">
      <Ellipse cx={90} cy={38} rx={71} ry={14} fill={STEEL_DEEP} stroke={INK} strokeWidth={3.4} />
      <Path d="M22 38 C26 10 154 10 158 38 Z" fill={STEEL} stroke={INK} strokeWidth={3.4} strokeLinejoin="round" />
      <Path d="M46 28 C60 20 78 18 94 18" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.55} />
      <Rect x={78} y={8} width={24} height={12} rx={6} fill={WOOD} stroke={INK} strokeWidth={3} />
    </Svg>
  );
}

// Steam escaping under the lid each time it rattles.
function LidPuff({ p, x, y }: { p: ReturnType<typeof useLoop>; x: number; y: number }) {
  const style = useAnimatedStyle(() => {
    const t = p.value;
    const a = Math.max(seg(t, 0.3, 0.52), seg(t, 0.62, 0.84));
    const live = a > 0 && a < 1 ? 1 : 0;
    return { opacity: live * Math.sin(a * Math.PI) * 0.8, transform: [{ translateY: -22 * a }, { scale: 0.5 + a * 0.8 }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: x - 10, top: y - 12 }, style]}>
      <Svg width={20} height={24} viewBox="0 0 30 36">
        <Path d="M15 1 C23 7 26 14 21 20 C17 25 20 29 15 35 C10 29 13 25 9 20 C4 14 7 7 15 1 Z" fill="#FFFFFF" />
      </Svg>
    </Animated.View>
  );
}

// Dial centre sits at (22, 26) in a 44x52 box. The hand sweeps a full turn,
// then the timer rings: that's the moment to move on.
function KitchenTimer({
  p,
  x,
  y,
  label,
}: {
  p: ReturnType<typeof useLoop>;
  x: number;
  y: number;
  label?: string | null;
}) {
  const hand = useAnimatedStyle(() => ({
    transform: [{ rotate: `${easeInOut(seg(p.value, 0.04, 0.84)) * 360}deg` }],
  }));

  const body = useAnimatedStyle(() => {
    const ring = bell(p.value, 0.84, 1);
    return { transform: [{ rotate: `${Math.sin(p.value * Math.PI * 60) * 9 * ring}deg` }] };
  });

  const ding = useAnimatedStyle(() => {
    const ring = bell(p.value, 0.84, 1);
    return { opacity: ring, transform: [{ scale: 0.7 + ring * 0.4 }] };
  });

  return (
    <View style={{ position: 'absolute', left: x - 30, top: y - 26, width: 60, alignItems: 'center' }} pointerEvents="none">
      <Animated.View style={[{ position: 'absolute', left: 0, top: 10 }, ding]}>
        <Svg width={60} height={32} viewBox="0 0 60 32">
          <Path d="M6 6 C2 12 2 20 6 26 M54 6 C58 12 58 20 54 26" stroke={ORDER_RED} strokeWidth={2.6} strokeLinecap="round" fill="none" />
        </Svg>
      </Animated.View>

      <Animated.View style={[{ width: 44, height: 52 }, body]}>
        <Svg width={44} height={52} viewBox="0 0 44 52">
          <Rect x={17} y={0} width={10} height={8} rx={2.5} fill={STEEL_DEEP} stroke={INK} strokeWidth={2.2} />
          <Circle cx={22} cy={26} r={18} fill="#FFFFFF" stroke={INK} strokeWidth={3} />
          <Path d="M22 11 V14 M37 26 H34 M22 41 V38 M7 26 H10" stroke={INK} strokeWidth={2} strokeLinecap="round" />
          <Circle cx={22} cy={26} r={2.4} fill={INK} />
        </Svg>
        <Animated.View style={[StyleSheet.absoluteFill, hand]}>
          <Svg width={44} height={52} viewBox="0 0 44 52">
            <Path d="M22 26 V13" stroke={ORDER_RED} strokeWidth={2.8} strokeLinecap="round" />
          </Svg>
        </Animated.View>
      </Animated.View>

      {label ? <Text style={styles.timerText}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  orderBadge: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: ORDER_RED,
    borderWidth: 2,
    borderColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', lineHeight: 12 },
  timerText: { marginTop: 1, fontSize: 10, fontWeight: '900', color: INK },
});
