import { useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import IngredientIcon from './IngredientIcon';
import { Stage } from './cooking/parts';
import { LoopSpeedContext, bell, seg, useLoop } from './cooking/motion';
import {
  AddScene,
  BakeScene,
  BoardScene,
  BowlScene,
  PanScene,
  PotScene,
  PourScene,
  RestScene,
  SeasonScene,
  ServeScene,
  WashScene,
  type HeatLevel,
  type Vessel,
} from './cooking/scenes';

export type Technique =
  | 'chop'
  | 'slice'
  | 'stir'
  | 'simmer'
  | 'fry'
  | 'flip'
  | 'pour'
  | 'whisk'
  | 'fold'
  | 'season'
  | 'bake'
  | 'serve'
  | 'add'
  | 'wash'
  | 'rest'
  | 'general';

// Ordered most-specific first — the first rule that matches wins, so a step
// like "Stir-fry the garlic" resolves to frying rather than stirring.
// The (?!ed) guards keep past participles out: "add the chopped onion and
// stir" is a stirring step, not a chopping one, and showing the wrong scene
// is exactly what makes a guide impossible to follow.
const RULES: { technique: Technique; test: RegExp }[] = [
  { technique: 'flip', test: /\bflip|\bturn over|ត្រឡប់/ },
  {
    technique: 'fry',
    test: /\bstir[-\s]?fry|\bdeep[-\s]?fry|\bpan[-\s]?fry|\bfry|\bfries\b|\bsaut|\bsear\b|\bbrown\b|\bmelt|ចៀន|បំពង|ឆា/,
  },
  { technique: 'bake', test: /\bbake|\bbaking\b|\boven\b|\broast|\bpreheat|\bgrill|\bbroil|អាំង|ដុត/ },
  { technique: 'chop', test: /\bchop(?!ped)|\bdice(?!d)|\bmince(?!d)|\bcube(?!d)|\bcut\b|កាត់/ },
  { technique: 'slice', test: /\bslice(?!d)|\bjulienne|\bshred(?!ded)|\bgrate(?!d)|\bpeel(?!ed)|ចិត/ },
  { technique: 'wash', test: /\bwash|\brinse|\bclean\b|លាង/ },
  // Waiting steps: the instruction is to leave it alone, so they win over the
  // mixing or simmering word that usually shares the sentence.
  {
    technique: 'rest',
    test: /\bcover (the (pot|pan|wok|bowl|dish)|with (a lid|plastic|cling|a plate|a towel|a cloth)|and (cook|simmer|steam|let|leave|rest|set))|\bcovered\b(?! with)|\blid\b|\blet (it |them |the \w+ )?(rest|sit|stand|cool|marinate)|\brest for|\bset aside|\bmarinate|\bsoak|\bleave (it |them )?(for|to)|\bwait|\brefrigerate|\bchill|គ្រប|ត្រាំ|ទុក/,
  },
  { technique: 'whisk', test: /\bwhisk|\bbeat\b|\bblend|\bknead|វាយ/ },
  { technique: 'fold', test: /\bfold|បត់/ },
  { technique: 'simmer', test: /\bsimmer|\bboil|\bsteam\b|\bbraise|\bstew\b|ស្ងោរ|ដាំ|ពុះ/ },
  { technique: 'pour', test: /\bpour|\bdrizzle|\bdrain|ចាក់/ },
  { technique: 'stir', test: /\bstir|\bmix|\bcombine|\btoss|លាយ|កូរ/ },
  { technique: 'season', test: /\bseason|\bsprinkle|\bdust with|to taste|អំបិល|ម្រេច/ },
  { technique: 'serve', test: /\bserve|\bplate\b|\bgarnish|\benjoy|ដាក់ចាន/ },
  // Last, so "add … and stir" stays a stirring step.
  { technique: 'add', test: /\badd\b|\badding\b|\bput\b|\bplace\b|\bthrow in|\bdrop in|បន្ថែម|ដាក់/ },
];

// Which container an "add" step drops into, read from the step's own words.
export function getVessel(stepText: string): Vessel {
  const t = stepText.toLowerCase();
  if (/\bpan\b|\bwok\b|\bskillet|ខ្ទះ/.test(t)) return 'pan';
  if (/\bbowl\b|ចានគោម/.test(t)) return 'bowl';
  return 'pot';
}

// Whether a waiting step happens over heat (lidded pot) or off it (resting bowl).
function isOnStove(stepText: string): boolean {
  return /\bsimmer|\bcook|\bboil|\bheat\b|\bsteam|\bpot\b|\bpan\b|\bwok\b|ស្ងោរ|ដាំ|ចម្អិន|ឆ្អិន|ខ្ទះ|ឆ្នាំង/.test(
    stepText.toLowerCase()
  );
}

export function getTechnique(stepText: string): Technique {
  const text = stepText.toLowerCase();
  for (const rule of RULES) {
    if (rule.test.test(text)) return rule.technique;
  }
  return 'general';
}

const STOVE_TECHNIQUES: Technique[] = ['fry', 'flip', 'simmer', 'stir', 'general', 'add', 'rest'];

// Reads the heat the step asks for. "Medium-high" and "medium-low" are checked
// before plain "medium" so they land on the side the cook actually needs.
// When the step says nothing, frying and simmering still imply a heat, which
// is the single thing beginners most often get wrong.
export function getHeatLevel(stepText: string, technique: Technique): HeatLevel | null {
  if (!STOVE_TECHNIQUES.includes(technique)) return null;
  const t = stepText.toLowerCase();
  if (/medium[-\s]*high|\b(high|full|strong|max|maximum)\s+(heat|flame)|\bsmoking hot|ភ្លើងខ្លាំង|ភ្លើងធំ/.test(t)) {
    return 'high';
  }
  if (/medium[-\s]*low|\b(low|lowest|gentle)\s+(heat|flame)|\breduce the heat|\bturn (the heat |it )?down|ភ្លើងតិច|ភ្លើងខ្សោយ/.test(t)) {
    return 'low';
  }
  if (/\b(medium|moderate)\s+(heat|flame)|ភ្លើងមធ្យម|ភ្លើងល្មម/.test(t)) return 'medium';

  if (technique === 'simmer') return /\bboil|ពុះ/.test(t) && !/\bsimmer/.test(t) ? 'high' : 'low';
  if (technique === 'fry') return /\bstir[-\s]?fry|\bdeep[-\s]?fry|\bsear\b|ឆា|បំពង/.test(t) ? 'high' : 'medium';
  if (technique === 'flip') return 'medium';
  if (technique === 'rest' && /\bsimmer|ស្ងោរ/.test(t)) return 'low';
  return null;
}

type Bilingual = { en: string; km: string };

// Naming the action removes the guesswork about what the scene is showing,
// and the cue says how the hand should move — the part a still recipe can't.
const TECHNIQUE_LABEL: Record<Technique, Bilingual> = {
  chop: { en: 'Chopping', km: 'ការកាត់' },
  slice: { en: 'Slicing', km: 'ការចិត' },
  stir: { en: 'Stirring', km: 'ការកូរ' },
  simmer: { en: 'Simmering', km: 'ការស្ងោរ' },
  fry: { en: 'Frying', km: 'ការចៀន' },
  flip: { en: 'Flipping', km: 'ការត្រឡប់' },
  pour: { en: 'Pouring', km: 'ការចាក់' },
  whisk: { en: 'Whisking', km: 'ការវាយ' },
  fold: { en: 'Folding', km: 'ការបត់' },
  season: { en: 'Seasoning', km: 'ការប្រឡាក់' },
  bake: { en: 'Baking', km: 'ការដុត' },
  serve: { en: 'Serving', km: 'ការរៀបចំ' },
  add: { en: 'Adding', km: 'ការដាក់បញ្ចូល' },
  wash: { en: 'Washing', km: 'ការលាង' },
  rest: { en: 'Waiting', km: 'ការរង់ចាំ' },
  general: { en: 'Cooking', km: 'ការចម្អិន' },
};

const MOTION_CUE: Record<Technique, Bilingual> = {
  chop: { en: 'Lift, then chop down', km: 'លើក ហើយកាត់ចុះ' },
  slice: { en: 'Thin strokes, back and forth', km: 'ចិតស្តើងៗ ទៅមក' },
  stir: { en: 'Stir in slow circles', km: 'កូរជារង្វង់យឺតៗ' },
  simmer: { en: 'Small, gentle bubbles', km: 'ពពុះតិចៗ ស្រាលៗ' },
  fry: { en: 'Sizzle until golden', km: 'ចៀនរហូតលឿងមាស' },
  flip: { en: 'Toss and turn it over', km: 'បោះ ហើយត្រឡប់' },
  pour: { en: 'Pour in slowly', km: 'ចាក់ចូលយឺតៗ' },
  whisk: { en: 'Fast, small circles', km: 'វាយលឿនៗ ជារង្វង់' },
  fold: { en: 'Scoop up and over', km: 'ដួសពីក្រោមឡើងលើ' },
  season: { en: 'Sprinkle evenly', km: 'រោយឱ្យស្មើ' },
  bake: { en: 'Bake until golden', km: 'ដុតរហូតលឿងមាស' },
  serve: { en: 'Plate up and enjoy', km: 'ដាក់ចាន ហើយរីករាយ' },
  add: { en: 'Add in this order', km: 'ដាក់តាមលំដាប់នេះ' },
  wash: { en: 'Rinse under running water', km: 'លាងក្រោមទឹកហូរ' },
  rest: { en: "Leave it alone until it's ready", km: 'ទុកវាចោល រហូតដល់ចប់' },
  general: { en: 'Follow the step below', km: 'ធ្វើតាមជំហានខាងក្រោម' },
};

const HEAT_LABEL: Record<HeatLevel, Bilingual> = {
  low: { en: 'Low heat', km: 'ភ្លើងតិច' },
  medium: { en: 'Medium heat', km: 'ភ្លើងមធ្យម' },
  high: { en: 'High heat', km: 'ភ្លើងខ្លាំង' },
};

const HEAT_FLAMES: Record<HeatLevel, number> = { low: 1, medium: 2, high: 3 };

// Slow motion stretches every loop by this much — enough to see each beat of
// a chop or a flip without the scene feeling frozen.
const SLOW_FACTOR = 2.2;

const BROWN = '#8A4B1E';
const CREAM_PILL = '#FFEFD9';
const PILL_BORDER = '#F0D9B5';

/* ---------------- action glyph ---------------- */

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type GlyphMotion = 'strike' | 'slide' | 'spin' | 'rock' | 'pulse' | 'shake' | 'flicker';

// Custom strokes for the moves Ionicons has no symbol for, in a 24x24 box.
const GLYPH_PATHS = {
  down: 'M12 4 V18 M6.5 12.5 L12 18 L17.5 12.5',
  across: 'M4 12 H19 M13.5 6.5 L19 12 L13.5 17.5',
  circle: 'M19 12 A7 7 0 1 1 15.5 5.94 M12.9 7.4 L16.8 6.7 L15.5 3',
  arc: 'M5 16 A7 7 0 0 1 19 16 M16 13.5 L19 17 L22 13.5',
  fold: 'M6 7 V13 A6 6 0 0 0 18 13 V9 M15 9.5 L18 6 L21 9.5',
  bubbles: 'M5 17 A3 3 0 1 0 11 17 A3 3 0 1 0 5 17 M12.6 11 A2.4 2.4 0 1 0 17.4 11 A2.4 2.4 0 1 0 12.6 11 M9.2 5.5 A1.8 1.8 0 1 0 12.8 5.5 A1.8 1.8 0 1 0 9.2 5.5',
} as const;

type GlyphSpec = {
  path?: keyof typeof GLYPH_PATHS;
  icon?: IoniconName;
  motion: GlyphMotion;
  period: number;
};

const GLYPH: Record<Technique, GlyphSpec> = {
  chop: { path: 'down', motion: 'strike', period: 1450 },
  slice: { path: 'across', motion: 'slide', period: 1700 },
  stir: { path: 'circle', motion: 'spin', period: 1500 },
  whisk: { path: 'circle', motion: 'spin', period: 700 },
  general: { path: 'circle', motion: 'spin', period: 2600 },
  simmer: { path: 'bubbles', motion: 'pulse', period: 1500 },
  fry: { icon: 'flame', motion: 'flicker', period: 700 },
  flip: { path: 'arc', motion: 'rock', period: 1900 },
  pour: { icon: 'water', motion: 'strike', period: 2600 },
  fold: { path: 'fold', motion: 'rock', period: 2800 },
  season: { icon: 'sparkles', motion: 'shake', period: 1500 },
  bake: { icon: 'thermometer', motion: 'pulse', period: 3200 },
  serve: { icon: 'restaurant', motion: 'pulse', period: 3000 },
  add: { icon: 'add-circle', motion: 'strike', period: 1300 },
  wash: { icon: 'water', motion: 'shake', period: 1400 },
  rest: { icon: 'hourglass-outline', motion: 'rock', period: 4200 },
};

// A tiny animated symbol of the hand movement, running at the scene's speed,
// so the label says the action and shows its direction in the same glance.
function ActionGlyph({ technique }: { technique: Technique }) {
  const spec = GLYPH[technique];
  const motion = spec.motion;
  const p = useLoop(spec.period);

  const style = useAnimatedStyle(() => {
    const t = p.value;
    switch (motion) {
      case 'strike':
        return { transform: [{ translateY: -2 + bell(t, 0.35, 0.6) * 4 }] };
      case 'slide':
        return { transform: [{ translateX: Math.sin(t * Math.PI * 2) * 2.5 }] };
      case 'spin':
        return { transform: [{ rotate: `${t * 360}deg` }] };
      case 'rock':
        return { transform: [{ rotate: `${Math.sin(t * Math.PI * 2) * 22}deg` }] };
      case 'shake':
        return {
          transform: [{ rotate: `${Math.sin(seg(t, 0.1, 0.7) * Math.PI * 6) * bell(t, 0.05, 0.8) * 20}deg` }],
        };
      case 'flicker':
        return { transform: [{ scaleY: 1 + Math.sin(t * Math.PI * 2) * 0.14 }, { scaleX: 1 - Math.sin(t * Math.PI * 2) * 0.06 }] };
      default:
        return { transform: [{ scale: 1 + ((Math.sin(t * Math.PI * 2) + 1) / 2) * 0.18 }] };
    }
  });

  return (
    <Animated.View style={[styles.glyph, style]}>
      {spec.path ? (
        <Svg width={16} height={16} viewBox="0 0 24 24">
          <Path
            d={GLYPH_PATHS[spec.path]}
            fill="none"
            stroke={BROWN}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      ) : (
        <Ionicons name={spec.icon ?? 'restaurant'} size={15} color={BROWN} />
      )}
    </Animated.View>
  );
}

/* ---------------- overlays ---------------- */

function HeatBadge({ level, km }: { level: HeatLevel; km: boolean }) {
  const lit = HEAT_FLAMES[level];
  const label = HEAT_LABEL[level];
  return (
    <View style={styles.heatBadge} accessibilityLabel={label.en}>
      <View style={styles.heatFlames}>
        {[1, 2, 3].map((n) => (
          <Ionicons key={n} name="flame" size={11} color={n <= lit ? '#F2682A' : '#E6D3BA'} />
        ))}
      </View>
      <Text style={styles.heatText}>{km ? label.km : label.en}</Text>
    </View>
  );
}

function SlowToggle({ slow, onToggle, km }: { slow: boolean; onToggle: () => void; km: boolean }) {
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ selected: slow }}
      accessibilityLabel={slow ? 'Play at normal speed' : 'Play in slow motion'}
      style={({ pressed }) => [styles.slowBtn, slow && styles.slowBtnOn, pressed && { opacity: 0.75 }]}
    >
      <Ionicons name="speedometer-outline" size={13} color={slow ? '#FFFFFF' : BROWN} />
      <Text style={[styles.slowText, slow && { color: '#FFFFFF' }]}>
        {slow ? (km ? 'ធម្មតា' : 'Normal') : km ? 'យឺត' : 'Slow'}
      </Text>
    </Pressable>
  );
}

/* ---------------- scene switch ---------------- */

function Scene({
  technique,
  nextTechnique,
  ingredients,
  heat,
  vessel,
  onStove,
  timerLabel,
}: {
  technique: Technique;
  nextTechnique?: Technique;
  ingredients: string[];
  heat: HeatLevel | null;
  vessel: Vessel;
  onStove: boolean;
  timerLabel?: string | null;
}) {
  switch (technique) {
    case 'add':
      return <AddScene ingredients={ingredients} vessel={vessel} heat={heat} />;
    case 'wash':
      return <WashScene ingredients={ingredients} />;
    case 'rest':
      return <RestScene ingredients={ingredients} onStove={onStove} heat={heat} timerLabel={timerLabel} />;
    case 'chop':
    case 'slice':
      return (
        <BoardScene
          ingredients={ingredients}
          variant={technique}
          goesToPot={nextTechnique === 'stir' || nextTechnique === 'simmer'}
        />
      );
    case 'fry':
    case 'flip':
      return <PanScene ingredients={ingredients} variant={technique} heat={heat} />;
    case 'pour':
      return <PourScene ingredients={ingredients} />;
    case 'whisk':
    case 'fold':
      return <BowlScene ingredients={ingredients} variant={technique} />;
    case 'season':
      return <SeasonScene ingredients={ingredients} />;
    case 'bake':
      return <BakeScene />;
    case 'serve':
      return <ServeScene ingredients={ingredients} />;
    default:
      return <PotScene ingredients={ingredients} variant={technique} heat={heat} />;
  }
}

export default function StepAnimation({
  technique,
  nextTechnique,
  ingredients = [],
  ingredientLabels,
  stepText = '',
  stepKey,
  timerLabel,
}: {
  technique: Technique;
  nextTechnique?: Technique;
  /** English ingredient names — they pick the drawings. */
  ingredients?: string[];
  /** What to print on each ingredient chip (display language, with amount). */
  ingredientLabels?: string[];
  /** The step's own text, read for the heat level. */
  stepText?: string;
  /** Changes whenever the step changes, so the new scene fades in fresh. */
  stepKey?: string | number;
  /** The step's time, e.g. "10 min" — shown on the waiting scene's timer. */
  timerLabel?: string | null;
}) {
  const { i18n, t } = useTranslation();
  const km = i18n.language === 'km';
  const { width } = useWindowDimensions();
  const [slow, setSlow] = useState(false);

  const stageWidth = Math.round(Math.min(268, Math.max(180, width - 104)));
  const label = TECHNIQUE_LABEL[technique];
  const cue = MOTION_CUE[technique];
  const vessel = getVessel(stepText);
  const onStove = isOnStove(stepText);
  // No flame, no heat badge: adding to a bowl or resting on the counter.
  const offHeat = (technique === 'add' && vessel === 'bowl') || (technique === 'rest' && !onStove);
  const heat = offHeat ? null : getHeatLevel(stepText, technique);
  const chips = ingredients.slice(0, 6);
  const sceneKey = `${stepKey ?? ''}-${technique}`;

  return (
    <LoopSpeedContext.Provider value={slow ? SLOW_FACTOR : 1}>
      <View style={styles.container}>
        <View style={{ width: stageWidth }}>
          <Stage width={stageWidth}>
            <Animated.View key={sceneKey} entering={FadeIn.duration(320)} style={StyleSheet.absoluteFill}>
              <Scene
                technique={technique}
                nextTechnique={nextTechnique}
                ingredients={ingredients}
                heat={heat}
                vessel={vessel}
                onStove={onStove}
                timerLabel={timerLabel}
              />
            </Animated.View>
          </Stage>

          {heat && (
            <View style={styles.heatSlot} pointerEvents="none">
              <HeatBadge level={heat} km={km} />
            </View>
          )}
          <View style={styles.slowSlot}>
            <SlowToggle slow={slow} onToggle={() => setSlow((s) => !s)} km={km} />
          </View>
        </View>

        <Animated.View key={`cue-${sceneKey}`} entering={FadeInDown.duration(280)} style={styles.pill}>
          <ActionGlyph technique={technique} />
          <Text style={styles.pillText}>{km ? label.km : label.en}</Text>
          <Text style={styles.pillCue} numberOfLines={1}>
            · {km ? cue.km : cue.en}
          </Text>
        </Animated.View>

        {chips.length > 0 && (
          <View style={styles.needs}>
            <Text style={styles.needsTitle}>{t('recipe.for_this_step')}</Text>
            <View style={styles.chipRow}>
              {chips.map((name, i) => (
                <View key={`${name}-${i}`} style={styles.chip}>
                  <IngredientIcon name={name} size={22} />
                  <Text style={styles.chipText} numberOfLines={1}>
                    {ingredientLabels?.[i] || name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </LoopSpeedContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: 14 },
  pill: {
    marginTop: 10,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 8,
    paddingRight: 14,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: CREAM_PILL,
    borderWidth: 1.5,
    borderColor: PILL_BORDER,
  },
  glyph: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { fontSize: 12.5, fontWeight: '800', color: BROWN, letterSpacing: 0.3 },
  pillCue: { flexShrink: 1, fontSize: 12.5, fontWeight: '600', color: '#A0663A' },
  heatSlot: { position: 'absolute', top: 10, left: 10 },
  heatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: PILL_BORDER,
  },
  heatFlames: { flexDirection: 'row', gap: 1 },
  heatText: { fontSize: 11, fontWeight: '800', color: BROWN },
  slowSlot: { position: 'absolute', right: 10, bottom: 10 },
  slowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: PILL_BORDER,
  },
  slowBtnOn: { backgroundColor: BROWN, borderColor: BROWN },
  slowText: { fontSize: 11, fontWeight: '800', color: BROWN },
  needs: { alignSelf: 'stretch', marginTop: 12 },
  needsTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#A0663A',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    textAlign: 'center',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '100%',
    paddingLeft: 3,
    paddingRight: 10,
    paddingVertical: 3,
    borderRadius: 16,
    backgroundColor: '#FFF6E9',
    borderWidth: 1,
    borderColor: PILL_BORDER,
  },
  chipText: { flexShrink: 1, fontSize: 12.5, fontWeight: '700', color: '#5A3420' },
});
