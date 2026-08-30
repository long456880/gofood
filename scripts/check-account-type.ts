import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT p.id, p.account_type, u.email
       FROM profiles p
       JOIN "user" u ON u.id = p.id
       WHERE u.email = $1`,
      ['feihengkimborat@gmail.com']
    );
    console.log(result.rows[0]);
  } finally {
    client.release();
    await pool.end();
  }
}

run();