import { extractKeywords } from '@/lib/recipe-utils';

// Heuristic overlap check to help admins spot a recipe that was likely
// copied from an existing one. It's keyword-set overlap (Jaccard), not a
// real plagiarism detector — two chefs independently posting a common dish
// (e.g. fried rice) will still score high, so this only flags candidates
// for a human to compare, it never decides on its own.
export type SimilarityCandidate = {
  id: string;
  title: string;
  chef_name: string | null;
  created_at: string;
  ingredients: string;
  steps: string;
};

export type SimilarityMatch = {
  id: string;
  title: string;
  chef_name: string | null;
  created_at: string;
  score: number;
};

function keywordSet(ingredients: string, steps: string): Set<string> {
  const words = new Set<string>();
  ingredients.split(',').forEach((ing) => extractKeywords(ing).forEach((w) => words.add(w)));
  extractKeywords(steps).forEach((w) => words.add(w));
  return words;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const w of a) {
    if (b.has(w)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Minimum keyword-overlap score (0-1) before a match is worth showing an
// admin. Tuned high-ish to avoid flooding review with dishes that just
// happen to share common ingredients.
export const SIMILARITY_THRESHOLD = 0.55;
const MAX_MATCHES = 3;

// Ranks `candidates` by keyword overlap against `target`, highest first.
// Returns the closest few with any overlap at all (even below the copy
// threshold) so an admin can see how close a recipe came to each one, not
// just whether it crossed the line.
export function findClosestRecipes(
  target: { ingredients: string; steps: string },
  candidates: SimilarityCandidate[]
): SimilarityMatch[] {
  const targetWords = keywordSet(target.ingredients, target.steps);
  if (targetWords.size === 0) return [];

  return candidates
    .map((c) => ({
      id: c.id,
      title: c.title,
      chef_name: c.chef_name,
      created_at: c.created_at,
      score: jaccard(targetWords, keywordSet(c.ingredients, c.steps)),
    }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_MATCHES);
}

// Just the ones at or above SIMILARITY_THRESHOLD — the "possible copy" flag.
export function findSimilarRecipes(
  target: { ingredients: string; steps: string },
  candidates: SimilarityCandidate[]
): SimilarityMatch[] {
  return findClosestRecipes(target, candidates).filter((m) => m.score >= SIMILARITY_THRESHOLD);
}
