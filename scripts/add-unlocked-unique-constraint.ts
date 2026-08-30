import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query(
      `ALTER TABLE unlocked_recipes
       ADD CONSTRAINT unlocked_recipes_user_recipe_unique UNIQUE (user_id, recipe_id)`
    );
    console.log('Constraint added successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

run();
