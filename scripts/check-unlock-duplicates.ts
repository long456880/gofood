import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT user_id, recipe_id, COUNT(*) as count
       FROM unlocked_recipes
       GROUP BY user_id, recipe_id
       HAVING COUNT(*) > 1`
    );
    if (result.rows.length === 0) {
      console.log('No duplicates found. Safe to add the UNIQUE constraint.');
    } else {
      console.log('Found duplicate rows:', result.rows);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run();