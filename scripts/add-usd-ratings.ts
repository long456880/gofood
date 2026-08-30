import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Adding price_usd column to recipes...');
    await client.query(`
      ALTER TABLE recipes
      ADD COLUMN IF NOT EXISTS price_usd numeric(10,2)
    `);

    console.log('Filling in starting USD prices based on old point costs...');
    await client.query(`
      UPDATE recipes
      SET price_usd = GREATEST(1.99, ROUND((point_cost / 50.0)::numeric, 2))
      WHERE is_free = false AND price_usd IS NULL
    `);

    console.log('Making sure pgcrypto extension is available (for uuid generation)...');
    try {
      await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    } catch (err) {
      console.log('Could not create extension (may already exist or lack permission) — continuing anyway.');
    }

    console.log('Creating ratings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ratings (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id text REFERENCES profiles(id) NOT NULL,
        recipe_id uuid REFERENCES recipes(id) NOT NULL,
        rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
        created_at timestamptz DEFAULT now(),
        UNIQUE(user_id, recipe_id)
      )
    `);

    console.log('Done! price_usd column added, prices filled in, ratings table created.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});