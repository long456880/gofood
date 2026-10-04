import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Adding reason column to recipe_reports...');
    await client.query(`
      ALTER TABLE recipe_reports
      ADD COLUMN IF NOT EXISTS reason text NOT NULL DEFAULT 'Not specified'
    `);
    console.log('Done! recipe_reports.reason ready.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
