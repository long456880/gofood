import { Pool } from 'pg';
import { translateToKhmer, translateIngredientsToKhmer } from '../lib/translate';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// One-off fixer for recipes that:
//  - published before Khmer auto-translation existed, or
//  - hit the free translation endpoint's rate limit at submit time and got
//    left with null _km columns, or
//  - got their ingredients_km translated as one joined blob (a bug fixed by
//    translateIngredientsToKhmer) instead of comma-by-comma, which collapses
//    every ingredient into a single unsplittable line in the UI.
// The last case is detected by comparing comma counts: if the English
// ingredients has commas but the Khmer version doesn't, the structure broke.
// Safe to re-run any time — it only touches rows that still need fixing.
async function run() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT id, title, description, ingredients, steps, ingredients_km
      FROM recipes
      WHERE status != 'deleted'
        AND (
          description_km IS NULL
          OR ingredients_km IS NULL
          OR steps_km IS NULL
          OR (ingredients LIKE '%,%' AND ingredients_km NOT LIKE '%,%')
        )
    `);

    console.log(`Found ${rows.length} recipe(s) needing Khmer text fixed.`);

    for (const recipe of rows) {
      console.log(`Translating "${recipe.title}" (${recipe.id})...`);
      const [descriptionKm, stepsKm] = await translateToKhmer([recipe.description, recipe.steps]);
      const ingredientsKm = await translateIngredientsToKhmer(recipe.ingredients);

      await client.query(
        `UPDATE recipes
         SET description_km = COALESCE($1, description_km),
             ingredients_km = COALESCE($2, ingredients_km),
             steps_km = COALESCE($3, steps_km)
         WHERE id = $4`,
        [descriptionKm, ingredientsKm, stepsKm, recipe.id]
      );

      const filled = [descriptionKm, ingredientsKm, stepsKm].filter(Boolean).length;
      console.log(`  -> filled ${filled}/3 fields`);
    }

    console.log('Done.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
