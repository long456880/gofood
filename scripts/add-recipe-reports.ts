import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Creating recipe_reports table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS recipe_reports (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
        reporter_id text REFERENCES profiles(id) NOT NULL,
        status text NOT NULL DEFAULT 'open',
        created_at timestamptz DEFAULT now(),
        UNIQUE(recipe_id, reporter_id)
      )
    `);
    console.log('Done! recipe_reports table ready.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
