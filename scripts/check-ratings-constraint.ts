import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT conname, contype
       FROM pg_constraint
       WHERE conrelid = 'ratings'::regclass AND contype = 'u'`
    );
    if (result.rows.length === 0) {
      console.log('NO unique constraint found on ratings table. Needs fixing.');
    } else {
      console.log('Unique constraint(s) found:', result.rows);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run();
