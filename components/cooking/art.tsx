import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { BROTH, BUTTER, CREAM, INK, PAN, PAN_DEEP, STEEL, STEEL_DEEP, WATER, WOOD, WOOD_DEEP } from './parts';

// Static props for the cooking scenes. Pieces named *Back / *Front share one
// box and viewBox so a scene can sandwich a moving part between them and get
// real depth — a spoon dipping behind the near rim of the pot, for instance.

// A flat slab with a hanging hole. An earlier version had a protruding handle
// on the right, which made the whole thing read as a rolling pin.
// Working surface sits at local y=10.
export const BOARD = { w: 160, h: 48, faceY: 10 };
export function Board() {
  return (
    <Svg width={BOARD.w} height={BOARD.h} viewBox="0 0 160 48">
      <Rect x={6} y={28} width={148} height={12} rx={6} fill={WOOD_DEEP} stroke={INK} strokeWidth={3.2} />
      <Rect x={6} y={10} width={148} height={24} rx={6} fill={WOOD} stroke={INK} strokeWidth={3.4} />
      <Circle cx={140} cy={22} r={3.6} fill="#FFF8EE" stroke={INK} strokeWidth={2.2} />
      <Path d="M24 18 H104" stroke={WOOD_DEEP} strokeWidth={2} strokeLinecap="round" opacity={0.3} />
      <Path d="M32 26 H86" stroke={WOOD_DEEP} strokeWidth={2} strokeLinecap="round" opacity={0.18} />
    </Svg>
  );
}

// A cleaver rather than a chef's knife: chunkier, friendlier, and short
// enough that the full lift of a chop stays inside the stage.
// Cutting edge sits at y=67, blade centred on x=32.
export const KNIFE = { w: 64, h: 80, edgeY: 67, edgeX: 32 };
export function Knife() {
  return (
    <Svg width={KNIFE.w} height={KNIFE.h} viewBox="0 0 64 80">
      <Rect x={24} y={2} width={18} height={26} rx={8} fill="#7A4E2D" stroke={INK} strokeWidth={3} />
      <Circle cx={33} cy={11} r={2.2} fill="#4A2C18" />
      <Path
        d="M10 26 H54 V58 A9 9 0 0 1 45 67 H19 A9 9 0 0 1 10 58 Z"
        fill={STEEL}
        stroke={INK}
        strokeWidth={3.2}
        strokeLinejoin="round"
      />
      <Circle cx={46} cy={36} r={3.2} fill="#FFF8EE" stroke={INK} strokeWidth={2} />
      <Path d="M17 60 H45" stroke="#FFFFFF" strokeWidth={3.4} strokeLinecap="round" opacity={0.8} />
    </Svg>
  );
}

export const POT = { w: 180, h: 120 };
export function PotBack() {
  return (
    <Svg width={POT.w} height={POT.h} viewBox="0 0 180 120">
      <Rect x={2} y={44} width={26} height={13} rx={6.5} fill={STEEL_DEEP} stroke={INK} strokeWidth={3} />
      <Rect x={152} y={44} width={26} height={13} rx={6.5} fill={STEEL_DEEP} stroke={INK} strokeWidth={3} />
      <Path
        d="M22 38 H158 L148 96 A18 18 0 0 1 130 110 H50 A18 18 0 0 1 32 96 Z"
        fill={STEEL}
        stroke={INK}
        strokeWidth={3.6}
        strokeLinejoin="round"
      />
      <Path d="M46 50 C42 68 44 84 52 97" stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" fill="none" opacity={0.5} />
      <Ellipse cx={90} cy={38} rx={70} ry={14} fill={STEEL_DEEP} stroke={INK} strokeWidth={3.6} />
      <Ellipse cx={90} cy={38} rx={58} ry={9.5} fill={BROTH} />
    </Svg>
  );
}

// The near lip of the pot, drawn over whatever is inside it.
export function PotFront() {
  return (
    <Svg width={POT.w} height={POT.h} viewBox="0 0 180 120">
      <Path d="M20 38 A70 14 0 0 0 160 38" fill="none" stroke={INK} strokeWidth={10} strokeLinecap="round" />
      <Path d="M20 38 A70 14 0 0 0 160 38" fill="none" stroke={STEEL_DEEP} strokeWidth={5} strokeLinecap="round" />
    </Svg>
  );
}

// Bowl of the spoon is centred at (22, 60) — scenes anchor the stir orbit there.
export const SPOON = { w: 44, h: 80, headX: 22, headY: 60 };
export function Spoon() {
  return (
    <Svg width={SPOON.w} height={SPOON.h} viewBox="0 0 44 80">
      <Rect x={16} y={2} width={11} height={46} rx={5.5} fill={WOOD} stroke={INK} strokeWidth={3} />
      <Ellipse cx={22} cy={60} rx={15} ry={17} fill={WOOD} stroke={INK} strokeWidth={3.2} />
      <Ellipse cx={22} cy={58} rx={8} ry={9.5} fill={WOOD_DEEP} opacity={0.5} />
    </Svg>
  );
}

export const PAN_BOX = { w: 200, h: 80 };
export function PanArt() {
  return (
    <Svg width={PAN_BOX.w} height={PAN_BOX.h} viewBox="0 0 200 80">
      <Rect
        x={148}
        y={14}
        width={50}
        height={12}
        rx={6}
        fill={PAN_DEEP}
        stroke={INK}
        strokeWidth={3}
        transform="rotate(-10 148 20)"
      />
      <Path
        d="M14 28 C14 54 40 68 84 68 C128 68 154 54 154 28"
        fill={PAN}
        stroke={INK}
        strokeWidth={3.6}
        strokeLinejoin="round"
      />
      <Ellipse cx={84} cy={28} rx={70} ry={15} fill={PAN} stroke={INK} strokeWidth={3.6} />
      <Ellipse cx={84} cy={29} rx={58} ry={11} fill="#6E6E7C" />
      <Ellipse cx={64} cy={26} rx={16} ry={5} fill="#FFFFFF" opacity={0.16} />
    </Svg>
  );
}

export const BOWL = { w: 170, h: 100 };
export function BowlBack({ fill = BUTTER }: { fill?: string }) {
  return (
    <Svg width={BOWL.w} height={BOWL.h} viewBox="0 0 170 100">
      <Rect x={66} y={82} width={38} height={10} rx={5} fill={CREAM} stroke={INK} strokeWidth={3} />
      <Path d="M12 26 C12 64 44 86 85 86 C126 86 158 64 158 26" fill={CREAM} stroke={INK} strokeWidth={3.6} />
      <Path d="M30 44 C30 60 40 70 52 76" stroke="#FFFFFF" strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.6} />
      <Ellipse cx={85} cy={26} rx={73} ry={16} fill="#FFFDF6" stroke={INK} strokeWidth={3.6} />
      <Ellipse cx={85} cy={27} rx={60} ry={11.5} fill={fill} />
    </Svg>
  );
}

export function BowlFront() {
  return (
    <Svg width={BOWL.w} height={BOWL.h} viewBox="0 0 170 100">
      <Path d="M12 26 A73 16 0 0 0 158 26" fill="none" stroke={INK} strokeWidth={10} strokeLinecap="round" />
      <Path d="M12 26 A73 16 0 0 0 158 26" fill="none" stroke="#FFFDF6" strokeWidth={5} strokeLinecap="round" />
    </Svg>
  );
}

// Wire cage is centred at (32, 66) and bulges wide, so it still reads as a
// whisk at small sizes instead of collapsing into a spindle.
export const WHISK = { w: 64, h: 96, headX: 32, headY: 66 };
export function Whisk() {
  return (
    <Svg width={WHISK.w} height={WHISK.h} viewBox="0 0 64 96">
      <Rect x={24} y={2} width={16} height={38} rx={8} fill="#C9CDD6" stroke={INK} strokeWidth={3} />
      <Path d="M32 40 C2 52 2 82 32 92" fill="none" stroke={INK} strokeWidth={3.4} strokeLinecap="round" />
      <Path d="M32 40 C62 52 62 82 32 92" fill="none" stroke={INK} strokeWidth={3.4} strokeLinecap="round" />
      <Path d="M32 40 C14 54 14 80 32 92" fill="none" stroke="#9AA4B0" strokeWidth={3} strokeLinecap="round" />
      <Path d="M32 40 C50 54 50 80 32 92" fill="none" stroke="#9AA4B0" strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

export const SPATULA = { w: 54, h: 118 };
export function Spatula() {
  return (
    <Svg width={SPATULA.w} height={SPATULA.h} viewBox="0 0 54 118">
      <Rect x={20} y={2} width={14} height={56} rx={7} fill="#7A4E2D" stroke={INK} strokeWidth={3} />
      <Path
        d="M14 56 H40 L44 96 A10 10 0 0 1 34 106 H20 A10 10 0 0 1 10 96 Z"
        fill="#EDE6D8"
        stroke={INK}
        strokeWidth={3.2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Drawn already tipped into the pour. The spout is on the right, so it has to
// rotate CLOCKWISE to tip downward — rotating the other way points the spout
// at the ceiling. Post-rotation the spout tip lands at (108, 72).
export const JUG = { w: 120, h: 110, spoutX: 108, spoutY: 72 };
export function Jug() {
  return (
    <Svg width={JUG.w} height={JUG.h} viewBox="0 0 120 110">
      <G transform="rotate(30 60 55)">
        <Path d="M22 40 C2 40 2 78 22 78" fill="none" stroke={INK} strokeWidth={11} strokeLinecap="round" />
        <Path d="M22 40 C2 40 2 78 22 78" fill="none" stroke="#EAF4F8" strokeWidth={5} strokeLinecap="round" />
        <Path d="M78 32 L110 46 L78 58 Z" fill="#D9EDF5" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <Rect x={18} y={20} width={64} height={78} rx={16} fill="#EAF4F8" stroke={INK} strokeWidth={3.6} />
        <Path d="M24 62 H76 V82 A10 10 0 0 1 66 92 H34 A10 10 0 0 1 24 82 Z" fill={WATER} opacity={0.9} />
        <Rect x={29} y={32} width={9} height={28} rx={4.5} fill="#FFFFFF" opacity={0.65} />
      </G>
    </Svg>
  );
}

export const SHAKER = { w: 76, h: 108 };
export function Shaker() {
  return (
    <Svg width={SHAKER.w} height={SHAKER.h} viewBox="0 0 76 108">
      <Path
        d="M20 36 C20 20 28 10 38 10 C48 10 56 20 56 36 L60 92 A10 10 0 0 1 50 102 H26 A10 10 0 0 1 16 92 Z"
        fill="#EAF2F8"
        stroke={INK}
        strokeWidth={3.4}
        strokeLinejoin="round"
      />
      <Path d="M18 74 H58 L60 92 A10 10 0 0 1 50 102 H26 A10 10 0 0 1 16 92 Z" fill="#FFFFFF" />
      <Rect x={20} y={2} width={36} height={16} rx={7} fill="#C3CBD2" stroke={INK} strokeWidth={3} />
      <Circle cx={30} cy={10} r={1.9} fill={INK} />
      <Circle cx={38} cy={10} r={1.9} fill={INK} />
      <Circle cx={46} cy={10} r={1.9} fill={INK} />
    </Svg>
  );
}

export const OVEN = { w: 150, h: 140 };
export function OvenBody() {
  return (
    <Svg width={OVEN.w} height={OVEN.h} viewBox="0 0 150 140">
      <Rect x={5} y={6} width={140} height={128} rx={16} fill="#E6EBEF" stroke={INK} strokeWidth={4} />
      <Rect x={16} y={16} width={118} height={18} rx={9} fill="#CFD8DF" stroke={INK} strokeWidth={2.6} />
      <Rect x={16} y={42} width={118} height={11} rx={5.5} fill="#B6C1CA" stroke={INK} strokeWidth={3} />
      <Rect x={20} y={60} width={110} height={64} rx={12} fill="#3A2A22" stroke={INK} strokeWidth={3.4} />
    </Svg>
  );
}

export const PLATE = { w: 180, h: 70 };
export function Plate() {
  return (
    <Svg width={PLATE.w} height={PLATE.h} viewBox="0 0 180 70">
      <Ellipse cx={90} cy={44} rx={84} ry={22} fill="#FFFFFF" stroke={INK} strokeWidth={3.6} />
      <Ellipse cx={90} cy={41} rx={62} ry={15} fill="#F7F2E9" stroke="#E0D7C6" strokeWidth={2} />
    </Svg>
  );
}

export const MOUND = { w: 120, h: 60 };
export function FoodMound({ fill = BROTH }: { fill?: string }) {
  return (
    <Svg width={MOUND.w} height={MOUND.h} viewBox="0 0 120 60">
      <Path d="M8 52 C14 16 106 16 112 52 Z" fill={fill} stroke={INK} strokeWidth={3.4} strokeLinejoin="round" />
      <Path d="M30 36 C42 26 58 24 70 28" stroke="#FFFFFF" strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.45} />
    </Svg>
  );
}

export function Leaf({ size = 26, fill = '#5BA84F' }: { size?: number; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26">
      <Path d="M23 3 C10 3 3 10 3 20 C3 23 6 23 8 23 C18 23 24 15 23 3 Z" fill={fill} stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
      <Path d="M20 6 C14 10 10 15 8 21" stroke={INK} strokeWidth={1.8} strokeLinecap="round" fill="none" opacity={0.55} />
    </Svg>
  );
}

// A cut piece — the slices that pile up on the board as chopping goes on.
export function SlicePiece({ size = 18, fill }: { size?: number; fill: string }) {
  return (
    <Svg width={size} height={size * 0.62} viewBox="0 0 20 12">
      <Ellipse cx={10} cy={6} rx={8.6} ry={4.6} fill={fill} stroke={INK} strokeWidth={2.2} />
      <Ellipse cx={10} cy={6} rx={4} ry={1.9} fill="#FFFFFF" opacity={0.35} />
    </Svg>
  );
}
