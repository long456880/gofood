import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Adding progress_image_1 / progress_image_2 columns to recipes...');
    await client.query(`
      ALTER TABLE recipes
      ADD COLUMN IF NOT EXISTS progress_image_1 text,
      ADD COLUMN IF NOT EXISTS progress_image_2 text
    `);
    console.log('Done.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
