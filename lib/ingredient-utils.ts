export type IngredientCategory =
  | 'meat'
  | 'seafood'
  | 'vegetable'
  | 'fruit'
  | 'dairy'
  | 'grain'
  | 'spice'
  | 'sweet'
  | 'herb'
  | 'liquid'
  | 'other';

const CATEGORY_KEYWORDS: Record<IngredientCategory, string[]> = {
  meat: ['chicken', 'beef', 'pork', 'lamb', 'bacon', 'sausage', 'meat', 'duck', 'turkey', 'ham'],
  seafood: ['shrimp', 'prawn', 'fish', 'salmon', 'tuna', 'crab', 'squid', 'octopus', 'mussel', 'clam', 'anchovy'],
  vegetable: ['onion', 'garlic', 'carrot', 'tomato', 'pepper', 'cabbage', 'potato', 'broccoli', 'spinach', 'lettuce', 'cucumber', 'eggplant', 'zucchini', 'mushroom', 'corn', 'bean', 'pea', 'ginger', 'chili', 'scallion', 'celery', 'kale'],
  fruit: ['lemon', 'lime', 'apple', 'mango', 'banana', 'coconut', 'pineapple', 'orange', 'berry', 'grape', 'avocado'],
  dairy: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'egg'],
  grain: ['rice', 'flour', 'noodle', 'pasta', 'bread', 'tortilla', 'oat', 'quinoa'],
  spice: ['salt', 'cumin', 'paprika', 'turmeric', 'cinnamon', 'pepper flakes', 'msg', 'spice', 'curry powder'],
  sweet: ['sugar', 'honey', 'syrup', 'chocolate', 'cocoa', 'vanilla', 'caramel'],
  herb: ['basil', 'cilantro', 'parsley', 'mint', 'thyme', 'rosemary', 'oregano', 'lemongrass', 'dill', 'herbes'],
  liquid: ['oil', 'water', 'broth', 'stock', 'sauce', 'vinegar', 'wine', 'soy sauce', 'fish sauce', 'coconut milk'],
  other: [],
};

// Strips a leading quantity + unit (e.g. "3 cloves garlic" -> "garlic",
// "4 tbsp olive oil" -> "olive oil") so we're left with just the core
// ingredient name to match and display.
const QTY_UNIT_REGEX = /^[\d/.\s½⅓⅔¼¾⅛០-៩]+\s*(cups?|tbsps?|tablespoons?|tsps?|teaspoons?|oz|ounces?|lbs?|pounds?|grams?|g|kilograms?|kg|milliliters?|ml|liters?|litres?|l|cloves?|pieces?|slices?|cans?|pinch(es)?|bunch(es)?|stalks?|sprigs?|heads?|packets?)?\s*/i;

export function cleanIngredientName(raw: string): string {
  const stripped = raw.replace(QTY_UNIT_REGEX, '').trim();
  const core = stripped.length > 0 ? stripped : raw.trim();
  return core.charAt(0).toUpperCase() + core.slice(1);
}

export function categorizeIngredient(name: string): IngredientCategory {
  const text = name.toLowerCase();
  for (const category of Object.keys(CATEGORY_KEYWORDS) as IngredientCategory[]) {
    if (category === 'other') continue;
    if (CATEGORY_KEYWORDS[category].some((kw) => text.includes(kw))) {
      return category;
    }
  }
  return 'other';
}

function includesLoose(haystack: string, needle: string): boolean {
  if (needle.length < 3) return false;
  if (haystack.includes(needle)) return true;
  // try the other of singular/plural in case the step phrases it differently
  if (needle.endsWith('s') && haystack.includes(needle.slice(0, -1))) return true;
  if (!needle.endsWith('s') && haystack.includes(needle + 's')) return true;
  return false;
}

// Scans a step's text and returns which of the recipe's real ingredients
// are mentioned in it (by their core name, quantity stripped), in the
// order they first appear — that order is the natural "add this, then
// that" guidance for the cook. Also returns each match's position in the
// original ingredient list, so a caller can look up a translated label
// for the same ingredient if needed.
export function detectStepIngredients(
  stepText: string,
  allIngredientNames: string[]
): { name: string; listIndex: number }[] {
  const text = stepText.toLowerCase();
  const matches: { name: string; listIndex: number; order: number }[] = [];

  allIngredientNames.forEach((raw, listIndex) => {
    const core = cleanIngredientName(raw).toLowerCase();
    if (!core) return;
    const order = text.indexOf(core);
    if (order !== -1) {
      matches.push({ name: cleanIngredientName(raw), listIndex, order });
    } else if (includesLoose(text, core)) {
      matches.push({ name: cleanIngredientName(raw), listIndex, order: text.length });
    }
  });

  matches.sort((a, b) => a.order - b.order);
  return matches.map(({ name, listIndex }) => ({ name, listIndex }));
}