import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Adding price_paid_usd column to unlocked_recipes...');
    await client.query(`
      ALTER TABLE unlocked_recipes
      ADD COLUMN IF NOT EXISTS price_paid_usd numeric(10,2)
    `);
    console.log('Done! Purchases will now record the exact price paid.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});