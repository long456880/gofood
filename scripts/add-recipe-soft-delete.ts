import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Adding deleted_at column to recipes...');
    await client.query(`
      ALTER TABLE recipes
      ADD COLUMN IF NOT EXISTS deleted_at timestamptz
    `);
    console.log('Done! Deleting a recipe now soft-deletes it (status = deleted, deleted_at set) instead of removing the row, so it can be restored within the grace window.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
