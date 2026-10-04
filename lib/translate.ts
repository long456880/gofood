// This is Google's public, undocumented translation endpoint — the same one
// libraries like Python's deep-translator hit for their key-less "Google"
// backend. It's the real Google neural MT engine (much better quality than
// MyMemory's translation-memory lookup, which was mistranslating ingredient
// names outright), and needs no API key or billing account. The tradeoff:
// it's unsupported by Google and can be rate-limited or blocked without
// notice, so this is fine for light/occasional use, not something to depend
// on long-term without a fallback.
const GOOGLE_TRANSLATE_ENDPOINT = "https://translate.googleapis.com/translate_a/single";

// Keeps well clear of any practical URL-length limit on the endpoint. Most
// recipe fields are far shorter than this and go through in one request;
// longer ones get split on word boundaries and rejoined in order.
const MAX_CHUNK_CHARS = 1800;

function chunkText(text: string): string[] {
  if (text.length <= MAX_CHUNK_CHARS) return [text];

  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > MAX_CHUNK_CHARS) {
      if (current) chunks.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTranslation(chunk: string): Promise<string> {
  const params = new URLSearchParams({ client: "gtx", sl: "en", tl: "km", dt: "t", q: chunk });
  const res = await fetch(`${GOOGLE_TRANSLATE_ENDPOINT}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Google Translate (unofficial) request failed (HTTP ${res.status})`);
  }

  const data = await res.json();
  // Response shape: [[[translatedSeg, originalSeg, ...], [translatedSeg2, ...], ...], ...]
  // Google splits long input into sentence-ish segments itself; stitch them
  // back together in order to get the full translation.
  const segments = data?.[0];
  if (!Array.isArray(segments)) {
    throw new Error("Unexpected Google Translate response shape");
  }
  return segments.map((seg: unknown) => (Array.isArray(seg) ? seg[0] ?? "" : "")).join("");
}

// Being an unsupported/undocumented endpoint, occasional failures (a burst
// rate-limit, a dropped connection) are expected, not exceptional — one
// retry after a short pause clears most of them without meaningfully
// slowing down a recipe submission.
async function translateChunk(chunk: string): Promise<string> {
  try {
    return await fetchTranslation(chunk);
  } catch {
    await sleep(500);
    return fetchTranslation(chunk);
  }
}

// Translates each non-empty string in `texts` from English to Khmer,
// preserving array order/positions. Empty or blank entries come back as null
// without being sent out. Each field is translated independently — if one
// field's request ultimately fails (after its retry), it comes back null
// without blanking out fields that succeeded, since a recipe getting a
// partial translation is still far more useful than getting none. Khmer
// text is a nice-to-have on top of a recipe, not a reason to block the
// upload, so callers never need to catch anything from this function.
export async function translateToKhmer(texts: string[]): Promise<(string | null)[]> {
  const result: (string | null)[] = texts.map(() => null);

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (!text || !text.trim()) continue;

    try {
      const chunks = chunkText(text);
      const translatedChunks: string[] = [];
      for (const chunk of chunks) {
        translatedChunks.push(await translateChunk(chunk));
      }
      result[i] = translatedChunks.join(" ");
    } catch (err) {
      console.error(`Khmer translation failed for field ${i}:`, err);
    }
  }

  return result;
}

// Ingredients are stored (and displayed) as a comma-separated list, and the
// UI splits on that comma to render one row per ingredient. Translating the
// whole joined string as a single sentence loses that structure — Google
// drops the commas and reorders words (Khmer puts the name before the
// quantity), collapsing every ingredient into one unsplittable line. Instead,
// each ingredient is translated on its own and rejoined with ", " so the
// comma-delimited shape survives translation. An ingredient that fails to
// translate falls back to its original English text rather than dropping
// the whole list — a partially-Khmer list still renders as proper rows.
export async function translateIngredientsToKhmer(ingredients: string): Promise<string | null> {
  const items = ingredients.split(",").map((s) => s.trim()).filter(Boolean);
  if (items.length === 0) return null;

  const translated = await translateToKhmer(items);
  if (translated.every((t) => t === null)) return null;

  return translated.map((t, i) => t ?? items[i]).join(", ");
}
