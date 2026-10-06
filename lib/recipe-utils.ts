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
  { term: "Marinate (soak in sauce)", termKm: 'ត្រាំ', test: /\bmarinat/i,
    definition: "Put the food in a sauce for some time. Then it tastes better when you cook it.",
    definitionKm: 'ដាក់អាហារក្នុងទឹកជ្រលក់មួយរយៈ។ ពេលចម្អិនវានឹងឆ្ងាញ់ជាង។' },
  { term: "Sauté (fry)", termKm: 'ឆា', test: /\bsaut/i,
    definition: "Cook in a little oil on a hot stove. Stir often so it does not burn.",
    definitionKm: 'ចៀនក្នុងប្រេងបន្តិច លើចង្ក្រានក្តៅ។ កូរញឹកញាប់ កុំឱ្យឆេះ។' },
  { term: "Simmer (cook slowly)", termKm: 'ស្ងោរ', test: /\bsimmer/i,
    definition: "Cook in water or soup on low heat. You should see only small bubbles.",
    definitionKm: 'ចម្អិនក្នុងទឹក ឬស៊ុប ដោយភ្លើងតិច។ គួរឃើញតែពពុះតូចៗ។' },
  { term: "Whisk (stir fast)", termKm: 'វាយ', test: /\bwhisk/i,
    definition: "Stir very fast with a fork or whisk. This mixes everything well.",
    definitionKm: 'កូរលឿនខ្លាំងដោយសម ឬសមវាយ។ វាធ្វើឱ្យលាយចូលគ្នាបានល្អ។' },
  { term: "Fold (mix gently)", termKm: 'បត់', test: /\bfold/i,
    definition: "Mix slowly. Lift the food from the bottom to the top. Do not stir hard.",
    definitionKm: 'លាយយឺតៗ។ លើកពីក្រោមឡើងលើ។ កុំកូរខ្លាំង។' },
  { term: "Dice / Mince (cut small)", termKm: 'កាត់ដុំតូច', test: /\b(dice|dicing|mince|mincing)\b/i,
    definition: "Cut into small pieces. Mince means cut into very, very small pieces.",
    definitionKm: 'កាត់ជាដុំតូចៗ។ ការកិន គឺកាត់ឱ្យតូចខ្លាំងណាស់។' },
  { term: "Julienne (cut in thin sticks)", termKm: 'ចិតស្តើង', test: /\bjulienne/i,
    definition: "Cut into long, thin sticks, like matchsticks.",
    definitionKm: 'កាត់ជាដំបងវែងៗស្តើងៗ ដូចឈើគូសភ្លើង។' },
  { term: "Blanch (boil quickly)", termKm: 'ស្ងោរលឿន', test: /\bblanch/i,
    definition: "Put in boiling water for a short time. Then put it in cold water to stop the cooking.",
    definitionKm: 'ដាក់ក្នុងទឹកពុះមួយភ្លែត។ បន្ទាប់មកដាក់ក្នុងទឹកត្រជាក់ ដើម្បីឈប់ឆ្អិន។' },
  { term: "Sear (brown the outside)", termKm: 'អាំងលឿន', test: /\bsear\b/i,
    definition: "Cook the outside on very high heat for a short time, until it turns brown.",
    definitionKm: 'ចម្អិនខាងក្រៅដោយភ្លើងខ្លាំងមួយភ្លែត រហូតទៅជាពណ៌ត្នោត។' },
  { term: "Deglaze (scrape the pan)", termKm: 'ដកសំណល់', test: /\bdeglaz/i,
    definition: "Pour water or sauce into the hot pan. Scrape the brown bits from the bottom. They taste good.",
    definitionKm: 'ចាក់ទឹក ឬទឹកជ្រលក់ចូលខ្ទះក្តៅ។ កោសសំណល់ពណ៌ត្នោតពីបាតខ្ទះ។ វាឆ្ងាញ់។' },
  { term: "Garnish (decorate)", termKm: 'តុបតែង', test: /\bgarnish/i,
    definition: "Put a little food on top to make the dish look nice. Do this just before you serve.",
    definitionKm: 'ដាក់អាហារបន្តិចលើខាងលើ ដើម្បីឱ្យស្អាត។ ធ្វើមុនពេលដាក់ចាន។' },
  { term: "Zest (lemon or orange skin)", termKm: 'សំបកលឿង', test: /\bzest/i,
    definition: "Scrape the colored skin of a lemon or orange. Do not use the white part. It tastes bitter.",
    definitionKm: 'កោសសំបកពណ៌នៃក្រូចឆ្មា ឬក្រូច។ កុំយកផ្នែកសខាងក្នុង។ វាល្វីង។' },
  { term: "Reduce (make thicker)", termKm: 'ស្រូបទឹក', test: /\breduc/i,
    definition: "Cook without a lid until some of the water goes away. The sauce gets thicker.",
    definitionKm: 'ចម្អិនដោយមិនគ្របគម្រប រហូតទឹកខ្លះហួត។ ទឹកជ្រលក់នឹងដិតជាង។' },
];

// Looks for one beginner-unfriendly cooking word in the step and returns a
// plain-language definition for it, in the given display language.
export function getGlossaryTip(stepText: string, km: boolean): string | null {
  const entry = GLOSSARY.find((g) => g.test.test(stepText));
  if (!entry) return null;
  return km ? `${entry.termKm} — ${entry.definitionKm}` : `${entry.term} means: ${entry.definition}`;
}

export const TECHNIQUE_TIPS: Record<Technique, string> = {
  stir: "Stir slowly in circles. Then everything cooks the same and does not burn.",
  whisk: "Stir fast with big, quick strokes. This puts air in the mixture.",
  slice: "Curl your fingers back. Use your knuckles to guide the knife.",
  chop: "Keep the tip of the knife on the board. Move the knife up and down.",
  fold: "Lift slowly from the bottom to the top. Do not stir, or the air will go out.",
  pour: "Pour slowly so nothing spills.",
  flip: "Wait until the edges look firm. Then turn it over.",
  simmer: "Use low heat so there are only small bubbles. Big bubbles can make the food hard.",
  fry: "Wait until the pan is hot. Then put the food in. This makes it golden and crispy.",
  season: "Add a little at a time. Taste it as you go. You can add more, but you cannot take it out.",
  bake: "Wait until the oven is fully hot. Do not open the door while it bakes.",
  serve: "Serve it while it is hot. Put it on a plate and bring it to the table now.",
  add: "Add the food one by one, in the order shown. Then each one cooks for the right time.",
  wash: "Wash with cool running water. Rub gently with your fingers until it is clean.",
  rest: "Set a timer and do not touch it. Opening the lid or stirring lets the heat out.",
  general: "Take your time and follow the step.",
};
export const TECHNIQUE_TIPS_KM: Record<Technique, string> = {
  stir: "កូរយឺតៗជារង្វង់។ ដូច្នេះអាហារឆ្អិនស្មើគ្នា ហើយមិនឆេះ។",
  whisk: "កូរលឿនៗ ដោយចលនាធំៗ។ វាធ្វើឱ្យមានខ្យល់ក្នុងគ្រឿងផ្សំ។",
  slice: "បត់ម្រាមដៃថយក្រោយ។ ប្រើថ្នាំងម្រាមដៃជាមគ្គុទ្ទេសក៍ឱ្យកាំបិត។",
  chop: "ទុកចុងកាំបិតលើក្តារ។ ដាក់កាំបិតឡើងចុះ។",
  fold: "លើកយឺតៗពីក្រោមឡើងលើ។ កុំកូរ បើមិនដូច្នេះខ្យល់នឹងបាត់។",
  pour: "ចាក់យឺតៗ កុំឱ្យកំពប់។",
  flip: "រង់ចាំរហូតគែមមើលទៅរឹង។ បន្ទាប់មកត្រឡប់វា។",
  simmer: "ប្រើភ្លើងតិច ឱ្យមានតែពពុះតូចៗ។ ពពុះធំៗអាចធ្វើឱ្យអាហាររឹង។",
  fry: "រង់ចាំរហូតខ្ទះក្តៅ ទើបដាក់អាហារចូល។ វាធ្វើឱ្យអាហារពណ៌មាស និងស្រួយ។",
  season: "ដាក់ម្តងបន្តិចៗ ហើយភ្លក់មើល។ អ្នកអាចដាក់បន្ថែមបាន តែយកចេញវិញមិនបាន។",
  bake: "រង់ចាំរហូតឡក្តៅពេញ។ កុំបើកទ្វារឡពេលកំពុងដុត។",
  serve: "ដាក់ចានពេលអាហារនៅក្តៅ។ នាំទៅតុភ្លាមៗ។",
  add: "ដាក់គ្រឿងផ្សំម្តងមួយៗ តាមលំដាប់ដែលបង្ហាញ។ ដូច្នេះវានីមួយៗឆ្អិនល្មម។",
  wash: "លាងដោយទឹកត្រជាក់ដែលហូរ។ ត្រដុសថ្នមៗដោយម្រាមដៃ រហូតស្អាត។",
  rest: "កំណត់ម៉ោង ហើយកុំប៉ះវា។ ការបើកគម្រប ឬកូរ ធ្វើឱ្យកម្តៅចេញ។",
  general: "ធ្វើយឺតៗ ហើយធ្វើតាមជំហាន។",
};
