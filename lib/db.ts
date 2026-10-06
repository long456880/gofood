import { Pool } from "pg";

// In dev, Metro re-evaluates this module on nearly every request (each API
// route rebundle re-runs its imports), which would otherwise create a fresh
// Pool — and its own batch of connections — every time. Supabase's
// session-mode pooler caps out at 15 clients total, so that leak exhausts it
// within a few reloads. Stashing the pool on `globalThis` lets it survive
// re-evaluation, and a low `max` keeps each pool small as a second line of
// defense.
const globalForDb = globalThis as unknown as { __gofoodDbPool?: Pool };

function createPool() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    keepAlive: true,
  });
  // Supabase's pooler drops idle connections (ECONNRESET). Without a listener,
  // the pool's 'error' event is unhandled and takes down the whole server.
  // The pool discards the dead client and opens a fresh one on the next query.
  pool.on("error", (err) => {
    console.warn("[db] idle connection dropped:", err.message);
  });
  return pool;
}

export const db = globalForDb.__gofoodDbPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__gofoodDbPool = db;
}