import type { ReactElement } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { categorizeIngredient, IngredientCategory } from '@/lib/ingredient-utils';

const CANVAS = 32;

const CATEGORY_STYLE: Record<IngredientCategory, { icon: any; color: string }> = {
  meat: { icon: 'restaurant-outline', color: '#D62828' },
  seafood: { icon: 'fish-outline', color: '#2C7FB0' },
  vegetable: { icon: 'leaf-outline', color: '#2E7D32' },
  fruit: { icon: 'nutrition-outline', color: '#E8871E' },
  dairy: { icon: 'water-outline', color: '#5CA9D6' },
  grain: { icon: 'pizza-outline', color: '#B08150' },
  spice: { icon: 'flame-outline', color: '#B23A21' },
  herb: { icon: 'flower-outline', color: '#3F8F6B' },
  liquid: { icon: 'wine-outline', color: '#6E0000' },
  other: { icon: 'ellipse-outline', color: '#8A8A8A' },
};

/* ---------------- hand-drawn ingredient art, each on a 32x32 canvas ---------------- */

function Eggplant() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.oval, { width: 15, height: 22, top: 6, left: 8, backgroundColor: '#6B3FA0', borderRadius: 10 }]} />
      <View style={[styles.leaf, { top: 1, left: 12, backgroundColor: '#3F8F3F' }]} />
      <View style={[styles.stem, { top: 2, left: 14.5, backgroundColor: '#3F8F3F' }]} />
    </View>
  );
}

function Zucchini() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.bar, { width: 24, height: 11, top: 10, left: 4, backgroundColor: '#4F8B3B', borderRadius: 6, transform: [{ rotate: '-18deg' }] }]} />
      <View style={[styles.dot, { width: 3, height: 3, top: 13, left: 12, backgroundColor: '#A9D28C' }]} />
      <View style={[styles.dot, { width: 3, height: 3, top: 16, left: 18, backgroundColor: '#A9D28C' }]} />
    </View>
  );
}

function BellPepper() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.oval, { width: 17, height: 19, top: 8, left: 7.5, backgroundColor: '#D6282E', borderRadius: 9 }]} />
      <View style={[styles.stem, { top: 2, left: 14.5, backgroundColor: '#3F8F3F' }]} />
      <View style={[styles.leaf, { top: 3, left: 17, backgroundColor: '#3F8F3F', transform: [{ rotate: '25deg' }] }]} />
    </View>
  );
}

function Chili() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.bar, { width: 20, height: 8, top: 13, left: 6, backgroundColor: '#D6282E', borderRadius: 5, transform: [{ rotate: '-25deg' }] }]} />
      <View style={[styles.stem, { top: 4, left: 7, backgroundColor: '#3F8F3F', transform: [{ rotate: '-25deg' }] }]} />
    </View>
  );
}

function Tomato() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.circle, { width: 20, height: 20, top: 8, left: 6, backgroundColor: '#E5382E' }]} />
      {[0, 45, 90, 135].map((r) => (
        <View key={r} style={[styles.bar, { width: 9, height: 2.5, top: 8, left: 11.5, backgroundColor: '#3F8F3F', borderRadius: 2, transform: [{ rotate: `${r}deg` }] }]} />
      ))}
    </View>
  );
}

function Onion() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.circle, { width: 20, height: 20, top: 8, left: 6, backgroundColor: '#F1D9B5', borderWidth: 2, borderColor: '#C99A5B' }]} />
      <View style={[styles.circle, { width: 12, height: 12, top: 12, left: 10, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#C99A5B' }]} />
      <View style={[styles.stem, { top: 1, left: 14.5, backgroundColor: '#8FAF6B' }]} />
    </View>
  );
}

function Garlic() {
  return (
    <View style={styles.canvas}>
      {[{ l: 8, t: 12 }, { l: 15, t: 9 }, { l: 18, t: 14 }, { l: 11, t: 17 }].map((p, i) => (
        <View key={i} style={[styles.oval, { width: 10, height: 12, top: p.t, left: p.l, backgroundColor: '#F7F3E8', borderWidth: 1, borderColor: '#D8CBA6', borderRadius: 6 }]} />
      ))}
      <View style={[styles.stem, { top: 1, left: 14.5, backgroundColor: '#8FAF6B' }]} />
    </View>
  );
}

function Carrot() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.bar, { width: 22, height: 10, top: 12, left: 6, backgroundColor: '#E8871E', borderRadius: 5, transform: [{ rotate: '20deg' }, { scaleX: 0.9 }] }]} />
      {[-8, 0, 8].map((o) => (
        <View key={o} style={[styles.bar, { width: 2, height: 8, top: 1, left: 15 + o, backgroundColor: '#3F8F3F', borderRadius: 2, transform: [{ rotate: `${o}deg` }] }]} />
      ))}
    </View>
  );
}

function Potato() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.oval, { width: 22, height: 17, top: 8, left: 5, backgroundColor: '#C99A5B', borderRadius: 11 }]} />
      <View style={[styles.dot, { width: 2.5, height: 2.5, top: 13, left: 11, backgroundColor: '#8B6A3D' }]} />
      <View style={[styles.dot, { width: 2.5, height: 2.5, top: 17, left: 18, backgroundColor: '#8B6A3D' }]} />
    </View>
  );
}

function Cucumber() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.bar, { width: 24, height: 10, top: 11, left: 4, backgroundColor: '#5FA24B', borderRadius: 6, transform: [{ rotate: '-15deg' }] }]} />
      <View style={[styles.bar, { width: 20, height: 2.5, top: 15, left: 6, backgroundColor: '#CFE8C0', borderRadius: 2, transform: [{ rotate: '-15deg' }] }]} />
    </View>
  );
}

function Mushroom() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.bar, { width: 6, height: 12, top: 17, left: 13, backgroundColor: '#F1E7D6', borderRadius: 3 }]} />
      <View style={[styles.dome, { width: 24, height: 14, top: 6, left: 4, backgroundColor: '#B5714A' }]} />
    </View>
  );
}

function Ginger() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.oval, { width: 13, height: 11, top: 11, left: 6, backgroundColor: '#E8C88A', borderRadius: 6 }]} />
      <View style={[styles.oval, { width: 12, height: 10, top: 8, left: 14, backgroundColor: '#E8C88A', borderRadius: 6 }]} />
    </View>
  );
}

function Citrus({ color }: { color: string }) {
  return (
    <View style={styles.canvas}>
      <View style={[styles.circle, { width: 20, height: 20, top: 6, left: 6, backgroundColor: color }]} />
      <View style={[styles.dot, { width: 3, height: 3, top: 4, left: 14.5, backgroundColor: '#3F8F3F' }]} />
    </View>
  );
}

function Mango() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.oval, { width: 18, height: 22, top: 5, left: 8, backgroundColor: '#E8871E', borderRadius: 10, transform: [{ rotate: '15deg' }] }]} />
      <View style={[styles.dot, { width: 6, height: 6, top: 6, left: 15, backgroundColor: '#D6282E', opacity: 0.5 }]} />
    </View>
  );
}

function Banana() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.bar, { width: 24, height: 9, top: 12, left: 4, backgroundColor: '#F2D24B', borderRadius: 5, transform: [{ rotate: '-20deg' }] }]} />
      <View style={[styles.dot, { width: 3, height: 3, top: 8, left: 4, backgroundColor: '#8B6A3D' }]} />
    </View>
  );
}

function Coconut() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.circle, { width: 22, height: 22, top: 5, left: 5, backgroundColor: '#6B4A2F' }]} />
      {[[10, 11], [16, 11], [13, 16]].map(([l, t], i) => (
        <View key={i} style={[styles.dot, { width: 2.5, height: 2.5, top: t, left: l, backgroundColor: '#241C1C' }]} />
      ))}
    </View>
  );
}

function Egg() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.oval, { width: 16, height: 21, top: 6, left: 8, backgroundColor: '#FBF2E2', borderWidth: 1.5, borderColor: '#E0D3B8', borderRadius: 9 }]} />
      <View style={[styles.dot, { width: 7, height: 7, top: 11, left: 12.5, backgroundColor: '#F2C14B' }]} />
    </View>
  );
}

function Milk() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.bar, { width: 14, height: 20, top: 8, left: 9, backgroundColor: '#F5F5F5', borderWidth: 1.5, borderColor: '#BFE3E0', borderRadius: 3 }]} />
      <View style={[styles.bar, { width: 14, height: 6, top: 2, left: 9, backgroundColor: '#BFE3E0', borderTopLeftRadius: 6, borderTopRightRadius: 6 }]} />
    </View>
  );
}

function Cheese() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.wedge, { borderBottomWidth: 18, borderLeftWidth: 24, top: 8, left: 4 }]} />
      <View style={[styles.dot, { width: 3, height: 3, top: 16, left: 14, backgroundColor: '#F1E7D6' }]} />
      <View style={[styles.dot, { width: 2.5, height: 2.5, top: 20, left: 18, backgroundColor: '#F1E7D6' }]} />
    </View>
  );
}

function Rice() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.dome, { width: 24, height: 13, top: 13, left: 4, backgroundColor: '#F7F3E8', borderWidth: 1.5, borderColor: '#D8CBA6' }]} />
      {[[9, 10], [14, 8], [19, 10]].map(([l, t], i) => (
        <View key={i} style={[styles.bar, { width: 5, height: 2, top: t, left: l, backgroundColor: '#F7F3E8', borderRadius: 1, transform: [{ rotate: '20deg' }] }]} />
      ))}
    </View>
  );
}

function Noodle() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.dome, { width: 24, height: 12, top: 14, left: 4, backgroundColor: '#F1E7D6', borderWidth: 1.5, borderColor: '#D8CBA6' }]} />
      {[7, 12, 17].map((t, i) => (
        <View key={i} style={[styles.bar, { width: 20, height: 2, top: t, left: 6, backgroundColor: '#E8C88A', borderRadius: 1, transform: [{ rotate: i % 2 === 0 ? '6deg' : '-6deg' }] }]} />
      ))}
    </View>
  );
}

function Meat({ color }: { color: string }) {
  return (
    <View style={styles.canvas}>
      <View style={[styles.circle, { width: 16, height: 16, top: 5, left: 9, backgroundColor: color }]} />
      <View style={[styles.bar, { width: 5, height: 12, top: 16, left: 14, backgroundColor: '#F1E7D6', borderRadius: 3, transform: [{ rotate: '20deg' }] }]} />
    </View>
  );
}

function Shrimp() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.bar, { width: 20, height: 9, top: 9, left: 7, backgroundColor: '#F0A0A0', borderRadius: 8, transform: [{ rotate: '35deg' }] }]} />
      <View style={[styles.leaf, { top: 3, left: 4, backgroundColor: '#F0A0A0', transform: [{ rotate: '100deg' }] }]} />
    </View>
  );
}

function Fish() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.oval, { width: 18, height: 10, top: 11, left: 5, backgroundColor: '#7FA8C9', borderRadius: 6 }]} />
      <View style={[styles.wedge, { borderBottomWidth: 10, borderLeftWidth: 8, top: 11, left: 21, transform: [{ scaleX: -1 }], borderBottomColor: '#7FA8C9' }]} />
      <View style={[styles.dot, { width: 2, height: 2, top: 14, left: 8, backgroundColor: '#241C1C' }]} />
    </View>
  );
}

function HerbSprig() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.bar, { width: 2, height: 20, top: 6, left: 15, backgroundColor: '#3F8F6B', borderRadius: 1 }]} />
      {[6, 11, 16].map((t, i) => (
        <View key={`l${i}`} style={[styles.dot, { width: 6, height: 3, top: t, left: 8, backgroundColor: '#3F8F6B', borderRadius: 2, transform: [{ rotate: '-30deg' }] }]} />
      ))}
      {[6, 11, 16].map((t, i) => (
        <View key={`r${i}`} style={[styles.dot, { width: 6, height: 3, top: t, left: 18, backgroundColor: '#3F8F6B', borderRadius: 2, transform: [{ rotate: '30deg' }] }]} />
      ))}
    </View>
  );
}

function HerbLeaf() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.leaf, { width: 20, height: 15, top: 8, left: 6, backgroundColor: '#3F8F6B', borderRadius: 12, transform: [{ rotate: '-20deg' }] }]} />
      <View style={[styles.stem, { top: 20, left: 14.5, backgroundColor: '#3F8F6B' }]} />
    </View>
  );
}

function OilBottle() {
  return (
    <View style={styles.canvas}>
      <View style={[styles.bar, { width: 12, height: 18, top: 10, left: 10, backgroundColor: '#B5C77A', opacity: 0.85, borderRadius: 3 }]} />
      <View style={[styles.bar, { width: 5, height: 8, top: 3, left: 13.5, backgroundColor: '#8FAF6B', borderRadius: 2 }]} />
      <View style={[styles.bar, { width: 7, height: 2.5, top: 2, left: 12.5, backgroundColor: '#4F6B3A', borderRadius: 1 }]} />
    </View>
  );
}

/* ---------------- keyword lookup — longer/specific keywords first ---------------- */

const SPECIFIC: { keywords: string[]; render: () => ReactElement }[] = [
  { keywords: ['eggplant', 'aubergine'], render: Eggplant },
  { keywords: ['zucchini', 'courgette'], render: Zucchini },
  { keywords: ['bell pepper', 'capsicum', 'red pepper', 'green pepper', 'yellow pepper', 'sweet pepper'], render: BellPepper },
  { keywords: ['chili', 'chilli', 'chile'], render: Chili },
  { keywords: ['tomato'], render: Tomato },
  { keywords: ['onion', 'scallion', 'shallot'], render: Onion },
  { keywords: ['garlic'], render: Garlic },
  { keywords: ['carrot'], render: Carrot },
  { keywords: ['potato'], render: Potato },
  { keywords: ['cucumber'], render: Cucumber },
  { keywords: ['mushroom'], render: Mushroom },
  { keywords: ['ginger'], render: Ginger },
  { keywords: ['lemongrass'], render: HerbSprig },
  { keywords: ['lemon'], render: () => <Citrus color="#F2D24B" /> },
  { keywords: ['lime'], render: () => <Citrus color="#A8CF45" /> },
  { keywords: ['mango'], render: Mango },
  { keywords: ['banana'], render: Banana },
  { keywords: ['coconut'], render: Coconut },
  { keywords: ['egg'], render: Egg },
  { keywords: ['milk', 'cream', 'yogurt'], render: Milk },
  { keywords: ['cheese'], render: Cheese },
  { keywords: ['rice'], render: Rice },
  { keywords: ['noodle', 'pasta', 'spaghetti'], render: Noodle },
  { keywords: ['chicken', 'duck', 'turkey'], render: () => <Meat color="#E8B98A" /> },
  { keywords: ['beef', 'pork', 'lamb', 'bacon', 'sausage', 'ham', 'meat'], render: () => <Meat color="#C9524A" /> },
  { keywords: ['shrimp', 'prawn'], render: Shrimp },
  { keywords: ['fish', 'salmon', 'tuna', 'anchovy'], render: Fish },
  { keywords: ['thyme', 'rosemary', 'oregano', 'herbes', 'dill'], render: HerbSprig },
  { keywords: ['basil', 'mint', 'cilantro', 'parsley'], render: HerbLeaf },
  { keywords: ['olive oil', 'oil'], render: OilBottle },
];

export function getIngredientArt(name: string): (() => ReactElement) | null {
  const text = name.toLowerCase();
  for (const entry of SPECIFIC) {
    if (entry.keywords.some((kw) => text.includes(kw))) return entry.render;
  }
  return null;
}

export default function IngredientIcon({ name, size = 36 }: { name: string; size?: number }) {
  const art = getIngredientArt(name);
  const category = categorizeIngredient(name);
  const { icon, color } = CATEGORY_STYLE[category];
  const scale = size / CANVAS;

  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: color + '1A' }]}>
      {art ? (
        <View style={{ width: CANVAS, height: CANVAS, transform: [{ scale }] }}>{art()}</View>
      ) : (
        <Ionicons name={icon} size={size * 0.55} color={color} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  canvas: { width: CANVAS, height: CANVAS },
  oval: { position: 'absolute' },
  circle: { position: 'absolute', borderRadius: 999 },
  bar: { position: 'absolute' },
  dot: { position: 'absolute', borderRadius: 999 },
  stem: { position: 'absolute', width: 3, height: 6, borderRadius: 2 },
  leaf: { position: 'absolute', width: 10, height: 6, borderRadius: 6 },
  dome: { position: 'absolute', borderTopLeftRadius: 999, borderTopRightRadius: 999 },
  wedge: {
    position: 'absolute',
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderBottomColor: '#F2D24B',
    borderRightColor: 'transparent',
  },
});
