import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Adding earnings_usd column to profiles...');
    await client.query(`
      ALTER TABLE profiles
      ADD COLUMN IF NOT EXISTS earnings_usd numeric(10,2) DEFAULT 0
    `);
    console.log('Done! Chefs can now accumulate USD earnings.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});