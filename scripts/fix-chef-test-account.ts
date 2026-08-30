import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE profiles p
       SET account_type = 'chef'
       FROM "user" u
       WHERE p.id = u.id AND u.email = $1
       RETURNING p.id, p.account_type, u.email`,
      ['chef@test.com']
    );
    console.log('Updated:', result.rows[0]);
  } finally {
    client.release();
    await pool.end();
  }
}

run();