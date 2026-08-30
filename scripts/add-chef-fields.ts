import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Adding account_type column to profiles...');
    await client.query(`
      ALTER TABLE profiles
      ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'home_cook'
    `);

    console.log('Adding chef_id column to recipes...');
    await client.query(`
      ALTER TABLE recipes
      ADD COLUMN IF NOT EXISTS chef_id text REFERENCES profiles(id)
    `);

    console.log('Looking up your account by email...');
    const userResult = await client.query(
      `SELECT id FROM "user" WHERE email = $1`,
      ['feihengkimborat@gmail.com']
    );

    if (userResult.rows.length === 0) {
      console.error('No user found with that email. Double-check you signed up with it.');
      return;
    }

    const chefUserId = userResult.rows[0].id;
    console.log('Found your account id:', chefUserId);

    console.log('Marking your profile as a chef...');
    await client.query(
      `UPDATE profiles SET account_type = 'chef' WHERE id = $1`,
      [chefUserId]
    );

    console.log('Assigning all existing recipes to your chef account...');
    const updateResult = await client.query(
      `UPDATE recipes SET chef_id = $1 WHERE chef_id IS NULL`,
      [chefUserId]
    );

    console.log(`Done! ${updateResult.rowCount} recipes assigned to your chef account.`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});