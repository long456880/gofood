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

export const TECHNIQUE_TIPS: Record<Technique, string> = {
  stir: 'Keep the motion steady and circular — this helps everything cook evenly without burning.',
  whisk: 'Use quick, wide strokes and lift slightly to fold air into the mixture.',
  slice: 'Curl your fingertips back and use your knuckles as a guide for the knife.',
  chop: 'Keep the knife tip on the board and rock it up and down for even cuts.',
  fold: "Use a gentle scooping motion from the bottom up — don't stir, or you'll lose the air.",
  pour: 'Pour slowly and steadily to keep control and avoid spilling or splashing.',
  flip: 'Wait until the edges look set before flipping, so it holds together.',
  simmer: 'Keep the heat low so the liquid barely bubbles — a full boil can toughen the food.',
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
  general: 'ចំណាយពេលធ្វើជំហាននេះ ហើយធ្វើតាមការណែនាំដោយប្រុងប្រយ័ត្ន។',
};

type DonenessRule = { keywords: string[]; en: string; km: string };
const DONENESS_RULES: DonenessRule[] = [
  { keywords: ['brown', 'golden', 'caramel', 'ត្នោត', 'មាស'], en: 'Ready when it turns a deep golden-brown color and smells toasty.', km: 'រួចរាល់នៅពេលមានពណ៌ត្នោតមាស និងមានក្លិនក្រអូប។' },
  { keywords: ['translucent', 'soften', 'ថ្លា'], en: "Ready when it turns soft and slightly see-through, not raw-looking.", km: 'រួចរាល់នៅពេលទន់ និងថ្លាបន្តិច មិនមើលទៅឆៅទៀត។' },
  { keywords: ['boil', 'ពុះ'], en: "You'll see big rolling bubbles breaking the surface continuously.", km: 'អ្នកនឹងឃើញពពុះធំៗបែកឥតឈប់នៅលើផ្ទៃទឹក។' },
  { keywords: ['simmer', 'ស្ងោរ'], en: 'Look for small, gentle bubbles — not a rapid boil.', km: 'រកមើលពពុះតូចៗ យឺតៗ — មិនមែនពុះខ្លាំង។' },
  { keywords: ['tender'], en: 'It should pierce easily with a fork with little resistance.', km: 'គួរចាក់ចូលងាយស្រួលដោយសមមួយ ដោយមិនស៊ូវរឹង។' },
  { keywords: ['crispy', 'crisp', 'ក្រឡុប'], en: 'Listen for a light crackling sound — the surface should look dry and firm.', km: 'ស្តាប់សំឡេងខ្ចាត់ខ្ចាយបន្តិច និងមើលផ្ទៃស្ងួត និងរឹង។' },
  { keywords: ['melt', 'រលាយ'], en: 'Ready when it turns smooth and glossy with no lumps left.', km: 'រួចរាល់នៅពេលរលោង និងភ្លឺ គ្មានដុំនៅសល់។' },
  { keywords: ['thicken', 'ក្រាស់'], en: 'It should coat the back of a spoon and slowly drip off.', km: 'គួរស្រោបខាងក្រោយស្លាបព្រា ហើយចាក់ចេញយឺតៗ។' },
  { keywords: ['rest', 'សម្រាក'], en: "Letting it rest keeps the juices in — don't skip this part.", km: 'ការទុកឱ្យសម្រាកជួយរក្សាទឹកសាច់ — កុំរំលងជំហាននេះ។' },
  { keywords: ['whip', 'stiff peak', 'វាយ'], en: "Ready when it holds a firm peak and doesn't collapse.", km: 'រួចរាល់នៅពេលវារឹង និងមិនរលាយ។' },
  { keywords: ['wilt'], en: 'Leafy greens are done once they shrink down and turn a darker green.', km: 'បន្លែស្លឹកបានហើយពេលវាតូចចុះ និងមានពណ៌បៃតងចាស់។' },
];

export function getDonenessCue(stepText: string): { en: string; km: string } | null {
  const lower = stepText.toLowerCase();
  for (const rule of DONENESS_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw.toLowerCase()))) return rule;
  }
  return null;
}