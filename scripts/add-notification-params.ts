import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Adding params column to notifications...');
    await client.query(`
      ALTER TABLE notifications
      ADD COLUMN IF NOT EXISTS params jsonb NOT NULL DEFAULT '{}'::jsonb
    `);
    console.log('Done! notifications.params ready — used to render notification text in the viewer\'s chosen language.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
