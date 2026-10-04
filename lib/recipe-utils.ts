import { Technique } from '@/components/StepAnimation';

export const RED = '#D62828';

const KHMER_DIGITS = '០១២៣៤៥៦៧៨៩';
const ARABIC_TO_KHMER: Record<string, string> = { '0':'០','1':'១','2':'២','3':'៣','4':'៤','5':'៥','6':'៦','7':'៧','8':'៨','9':'៩' };

export function khmerToArabicDigits(s: string): string {
  return s.replace(/[០-៩]/g, (d) => String(KHMER_DIGITS.indexOf(d)));
}
export function arabicToKhmerDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => ARABIC_TO_KHMER[d]);
}

export function scaleIngredients(ingredients: string, servings: number): string[] {
  const base = 2;
  const ratio = servings / base;
  return ingredients.split(',').map((ing) => {
    const trimmed = ing.trim();
    const scaled = trimmed.replace(/([0-9\u17E0-\u17E9]+\.?[0-9\u17E0-\u17E9]*)/g, (match) => {
      const isKhmerNum = /[\u17E0-\u17E9]/.test(match);
      const num = parseFloat(khmerToArabicDigits(match)) * ratio;
      let resultStr: string;
      if (num % 1 === 0) resultStr = String(num);
      else if (num < 1) resultStr = num.toFixed(1);
      else resultStr = num.toFixed(1).replace(/\.0$/, '');
      return isKhmerNum ? arabicToKhmerDigits(resultStr) : resultStr;
    });
    return scaled.charAt(0).toUpperCase() + scaled.slice(1);
  }).filter(Boolean);
}

// Longer/plural forms listed before their prefix-sharing singular so a
// straightforward "starts with" unit check doesn't stop short (e.g. matching
// "cup" inside "cups" and leaving a stray "s" glued to the ingredient name).
const INGREDIENT_UNITS = [
  'tablespoons', 'tablespoon', 'teaspoons', 'teaspoon', 'tbsps', 'tbsp', 'tsp',
  'cups', 'cup', 'ounces', 'ounce', 'oz', 'pounds', 'pound', 'lbs', 'lb',
  'grams', 'gram', 'g', 'kilograms', 'kilogram', 'kg',
  'milliliters', 'milliliter', 'ml', 'liters', 'liter', 'l',
  'cloves', 'clove', 'slices', 'slice', 'pinches', 'pinch', 'cans', 'can',
  'bunches', 'bunch', 'heads', 'head', 'sprigs', 'sprig', 'pieces', 'piece',
  'stalks', 'stalk', 'leaves', 'leaf', 'sticks', 'stick', 'handfuls', 'handful',
];
const QTY_PATTERN = '[0-9០-៩]+(?:\\s*[\\/\\-]\\s*[0-9០-៩]+)?(?:\\.[0-9០-៩]+)?';
const QTY_RE = new RegExp(`^(${QTY_PATTERN})(?:\\s+(.*))?$`, 'i');
const UNIT_RE = new RegExp(`^(${INGREDIENT_UNITS.join('|')})\\b\\.?\\s*(.*)$`, 'i');

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// Splits an already-scaled ingredient line like "2 cups rice" into a leading
// amount ("2 cups") and the plain ingredient name ("Rice"), so the UI can show
// them as two aligned columns instead of one run-on sentence fragment. Lines
// with no leading quantity (e.g. "Salt to taste") come back with amount: ''.
export function splitIngredientAmount(text: string): { amount: string; name: string } {
  const trimmed = text.trim();
  const qtyMatch = trimmed.match(QTY_RE);
  if (!qtyMatch || !qtyMatch[2]) {
    return { amount: '', name: capitalize(trimmed) };
  }
  const qty = qtyMatch[1];
  const rest = qtyMatch[2].trim();
  const unitMatch = rest.match(UNIT_RE);
  if (unitMatch) {
    return { amount: `${qty} ${unitMatch[1]}`, name: capitalize(unitMatch[2].trim()) };
  }
  return { amount: qty, name: capitalize(rest) };
}

export function formatDuration(mins: number): string {
  if (mins >= 60 && mins % 60 === 0) return `${mins / 60} hr`;
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins} min`;
}

export function parseSteps(steps: string): { text: string; minutes: number[] }[] {
  const raw = steps.split(/(?=[0-9\u17E0-\u17E9]+\.\s)/).map((s) => s.trim()).filter(Boolean);
  return raw.map((step) => {
    const minutes: number[] = [];
    const enRegex = /(\d+)\s*(min|minute|minutes|hour|hours)/gi;
    let m;
    while ((m = enRegex.exec(step)) !== null) {
      const num = parseInt(m[1]);
      minutes.push(m[2].toLowerCase().startsWith('hour') ? num * 60 : num);
    }
    const kmRegex = /([0-9\u17E0-\u17E9]+)\s*(នាទី|ម៉ោង)/g;
    while ((m = kmRegex.exec(step)) !== null) {
      const num = parseInt(khmerToArabicDigits(m[1]));
      minutes.push(m[2] === 'ម៉ោង' ? num * 60 : num);
    }
    return { text: step, minutes };
  });
}

const IGNORE_WORDS = new Set([
  'g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'tbsps', 'cup', 'cups', 'oz', 'lb', 'lbs',
  'clove', 'cloves', 'slice', 'slices', 'pinch', 'pinches', 'can', 'cans',
  'bunch', 'head', 'sprig', 'sprigs', 'leaf', 'leaves', 'large', 'medium',
  'small', 'ripe', 'fresh', 'extra', 'chopped', 'sliced', 'diced', 'minced',
  'and', 'the', 'a', 'of', 'for',
]);

export function extractKeywords(ingredient: string): string[] {
  return ingredient
    .replace(/[0-9\u17E0-\u17E9]+(\.[0-9]+)?/g, ' ')
    .split(/\s+/)
    .map((w) => w.toLowerCase().replace(/[^a-z\u1780-\u17FF]/gi, ''))
    .filter((w) => w.length >= 3 && !IGNORE_WORDS.has(w));
}

export function getStepIngredientIndices(stepText: string, ingredients: string[]): number[] {
  const lowerStep = stepText.toLowerCase();
  const indices: number[] = [];
  ingredients.forEach((ing, i) => {
    const keywords = extractKeywords(ing);
    if (keywords.some((kw) => lowerStep.includes(kw))) indices.push(i);
  });
  return indices;
}

export function getHighlightSegments(stepText: string, ingredients: string[]): { text: string; hl: boolean }[] {
  const allKeywords = new Set<string>();
  ingredients.forEach((ing) => extractKeywords(ing).forEach((k) => allKeywords.add(k)));
  if (allKeywords.size === 0) return [{ text: stepText, hl: false }];

  const sorted = Array.from(allKeywords)
    .sort((a, b) => b.length - a.length)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${sorted.join('|')})`, 'gi');
  const parts = stepText.split(regex).filter((p) => p !== undefined && p !== '');

  return parts.map((p) => ({ text: p, hl: allKeywords.has(p.toLowerCase()) }));
}

// Plain-English definitions for cooking words that trip up beginners — shown
// under any step that uses one, for every recipe, instead of relying on each
// chef to explain their own wording.
type GlossaryEntry = { term: string; termKm: string; definition: string; definitionKm: string; test: RegExp };

const GLOSSARY: GlossaryEntry[] = [
  { term: 'Marinate', termKm: 'ត្រាំ', test: /\bmarinat/i,
    definition: 'Let the food sit in a seasoned liquid for a while so the flavor soaks in before cooking.',
    definitionKm: 'ទុកអាហារត្រាំក្នុងទឹកជ្រលក់មួយរយៈ ដើម្បីឱ្យរសជាតិជ្រាបចូល មុននឹងចម្អិន។' },
  { term: 'Sauté', termKm: 'ឆា', test: /\bsaut/i,
    definition: "Cook quickly in a little oil over fairly high heat, stirring often so it doesn't burn.",
    definitionKm: 'ចៀនរហ័សក្នុងប្រេងបន្តិចដោយភ្លើងខ្លាំងបន្តិច ព្រមទាំងកូរញឹកញាប់ កុំឱ្យឆេះ។' },
  { term: 'Simmer', termKm: 'ស្ងោរ', test: /\bsimmer/i,
    definition: 'Cook gently in liquid with small, slow bubbles — not a hard, rolling boil.',
    definitionKm: 'ចម្អិនស្រាលៗក្នុងទឹកដោយពពុះតូចៗ មិនមែនពុះខ្លាំង។' },
  { term: 'Whisk', termKm: 'វាយ', test: /\bwhisk/i,
    definition: 'Stir quickly and firmly, usually with a fork or whisk, to mix everything smoothly or add air.',
    definitionKm: 'កូរលឿននិងខ្លាំង ជាធម្មតាប្រើសម ដើម្បីលាយឱ្យស្មើ ឬដាក់ខ្យល់ចូល។' },
  { term: 'Fold', termKm: 'បត់', test: /\bfold/i,
    definition: 'Gently mix by turning the mixture over itself from the bottom up, so it stays light and airy.',
    definitionKm: 'លាយថ្នមៗដោយត្រឡប់គ្រឿងផ្សំពីក្រោមឡើងលើ ដើម្បីរក្សាភាពស្រាល។' },
  { term: 'Dice / Mince', termKm: 'កាត់ដុំតូច', test: /\b(dice|dicing|mince|mincing)\b/i,
    definition: 'Cut into small, even pieces — mincing means cutting it even smaller, almost like a paste.',
    definitionKm: 'កាត់ជាដុំតូចៗស្មើគ្នា — ការកិនគឺកាត់ឱ្យតូចជាងនេះទៀត។' },
  { term: 'Julienne', termKm: 'ចិតស្តើង', test: /\bjulienne/i,
    definition: 'Cut into thin, matchstick-sized strips.',
    definitionKm: 'ចិតជាចម្រៀកស្តើងៗដូចដំបង។' },
  { term: 'Blanch', termKm: 'ស្ងោរលឿន', test: /\bblanch/i,
    definition: 'Boil briefly, then dip straight into cold water to stop it from cooking further.',
    definitionKm: 'ស្ងោរមួយភ្លែត រួចដាក់ក្នុងទឹកត្រជាក់ភ្លាមៗ ដើម្បីបញ្ឈប់កំដៅ។' },
  { term: 'Sear', termKm: 'អាំងលឿន', test: /\bsear\b/i,
    definition: 'Cook the surface briefly on high heat until it browns, to lock in flavor.',
    definitionKm: 'អាំងផ្ទៃម្តងសិនដោយភ្លើងខ្លាំង រហូតប្រែពណ៌ ដើម្បីរក្សារសជាតិ។' },
  { term: 'Deglaze', termKm: 'ដកសំណល់', test: /\bdeglaz/i,
    definition: 'Pour liquid into the hot pan and scrape up the tasty browned bits stuck to the bottom.',
    definitionKm: 'ចាក់ទឹកចូលខ្ទះក្តៅ ហើយកោសយកសំណល់ពណ៌ត្នោតដែលឆ្ងាញ់ចេញ។' },
  { term: 'Garnish', termKm: 'តុបតែង', test: /\bgarnish/i,
    definition: 'Add a little something on top for looks and extra flavor, right before serving.',
    definitionKm: 'ដាក់អ្វីមួយបន្តិចលើអាហារ ដើម្បីភាពស្រស់ស្អាត និងរសជាតិបន្ថែម មុននឹងដាក់ចាន។' },
  { term: 'Zest', termKm: 'សំបកលឿង', test: /\bzest/i,
    definition: 'Grate just the colored outer skin of a citrus fruit, not the bitter white part underneath.',
    definitionKm: 'កោសយកតែសំបកខាងក្រៅដែលមានពណ៌របស់ក្រូច កុំយកផ្នែកសនៅខាងក្នុង។' },
  { term: 'Reduce', termKm: 'ស្រូបទឹក', test: /\breduc/i,
    definition: 'Simmer a liquid uncovered so some of it evaporates, making it thicker and stronger in flavor.',
    definitionKm: 'ស្ងោរទឹកដោយមិនគ្របគម្រប ដើម្បីឱ្យទឹកខ្លះហួតទៅ ធ្វើឱ្យវាដិតជាងមុន។' },
];

// Looks for one beginner-unfriendly cooking word in the step and returns a
// plain-language definition for it, in the given display language.
export function getGlossaryTip(stepText: string, km: boolean): string | null {
  const entry = GLOSSARY.find((g) => g.test.test(stepText));
  if (!entry) return null;
  return km ? `${entry.termKm} — ${entry.definitionKm}` : `${entry.term} means: ${entry.definition}`;
}

export const TECHNIQUE_TIPS: Record<Technique, string> = {
  stir: 'Keep the motion steady and circular — this helps everything cook evenly without burning.',
  whisk: 'Use quick, wide strokes and lift slightly to fold air into the mixture.',
  slice: 'Curl your fingertips back and use your knuckles as a guide for the knife.',
  chop: 'Keep the knife tip on the board and rock it up and down for even cuts.',
  fold: "Use a gentle scooping motion from the bottom up — don't stir, or you'll lose the air.",
  pour: 'Pour slowly and steadily to keep control and avoid spilling or splashing.',
  flip: 'Wait until the edges look set before flipping, so it holds together.',
  simmer: 'Keep the heat low so the liquid barely bubbles — a full boil can toughen the food.',
  fry: "Let the pan get properly hot before the food goes in — that's what gives a golden crust instead of steam.",
  season: "Season a little at a time and taste as you go — you can always add more, but you can't take it out.",
  bake: 'Let the oven come up to full temperature first, and keep the door shut while it bakes.',
  serve: 'Serve it while it is still hot — plate it up and bring it to the table straight away.',
  add: 'Add the ingredients one at a time in the order shown, so each one gets the cooking time it needs.',
  wash: 'Rinse under cool running water and rub gently with your fingers until no dirt or grit is left.',
  rest: "Set a timer and leave it alone — lifting the lid or stirring lets the heat and flavour escape.",
  general: 'Take your time with this step and follow the instructions closely.',
};
export const TECHNIQUE_TIPS_KM: Record<Technique, string> = {
  stir: 'រក្សាចលនាឱ្យស្មើ និងជារង្វង់ — វាជួយឱ្យអាហារឆ្អិនស្មើគ្នាដោយមិនឆេះ។',
  whisk: 'ប្រើចលនាលឿន និងធំ ហើយលើកបន្តិចដើម្បីដាក់ខ្យល់ចូលគ្រឿងផ្សំ។',
  slice: 'កោងចុងម្រាមដៃថយក្រោយ ប្រើប្រម៉ង់ជាមគ្គុទ្ទេសក៍សម្រាប់កាំបិត។',
  chop: 'រក្សាចុងកាំបិតនៅលើក្តារ ហើយបោះឡើងចុះសម្រាប់ការកាត់ស្មើគ្នា។',
  fold: 'ប្រើចលនាដាវយឺតៗពីក្រោមឡើងលើ — កុំកូរ បើមិនដូច្នេះខ្យល់នឹងបាត់។',
  pour: 'ចាក់យឺតៗ និងស្មើ ដើម្បីគ្រប់គ្រង និងជៀសវាងកម្ពស់ ឬខ្ចាត់ខ្ចាយ។',
  flip: 'រង់ចាំរហូតគែមមើលទៅរឹង មុននឹងត្រឡប់ ដើម្បីឱ្យវានៅជាប់គ្នា។',
  simmer: 'រក្សាកម្តៅទាប ដើម្បីទឹកបែកពពុះបន្តិចបន្តួច — ស្ងោរខ្លាំងអាចធ្វើឱ្យអាហាររឹង។',
  fry: 'ទុកឱ្យខ្ទះក្តៅល្អមុននឹងដាក់អាហារចូល ទើបបានពណ៌មាសស្រួយ។',
  season: 'ប្រឡាក់ម្តងបន្តិចៗ ហើយភ្លក់មើល — អ្នកអាចបន្ថែមបាន តែយកចេញវិញមិនបាន។',
  bake: 'ទុកឱ្យឡក្តៅគ្រប់កម្រិតជាមុនសិន ហើយកុំបើកទ្វារឡខណៈកំពុងដុត។',
  serve: 'ដាក់ចានពេលអាហារនៅក្តៅ ហើយនាំទៅតុភ្លាមៗ។',
  add: 'ដាក់គ្រឿងផ្សំម្តងមួយៗ តាមលំដាប់ដែលបង្ហាញ ដើម្បីឱ្យវានីមួយៗឆ្អិនល្មម។',
  wash: 'លាងក្រោមទឹកត្រជាក់ដែលហូរ ហើយត្រដុសថ្នមៗរហូតដល់គ្មានដី ឬកម្ទេចកម្ទី។',
  rest: 'កំណត់ម៉ោង ហើយទុកវាចោល — ការបើកគម្រប ឬកូរ ធ្វើឱ្យកម្តៅ និងរសជាតិបាត់។',
  general: 'ចំណាយពេលធ្វើជំហាននេះ ហើយធ្វើតាមការណែនាំដោយប្រុងប្រយ័ត្ន។',
};

