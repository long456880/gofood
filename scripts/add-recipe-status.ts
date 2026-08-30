import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Adding status column to recipes...');
    await client.query(`
      ALTER TABLE recipes
      ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending'
    `);

    console.log('Marking all existing recipes as approved (they were already live)...');
    const result = await client.query(`
      UPDATE recipes SET status = 'approved' WHERE status = 'pending'
    `);

    console.log(`Done! ${result.rowCount} existing recipes marked as approved. New chef uploads will default to 'pending'.`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});