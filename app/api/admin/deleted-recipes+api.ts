import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";

const ADMIN_EMAIL = "feihengkimborat@gmail.com";
const RESTORE_WINDOW_DAYS = 3;

export async function GET(request: Request) {
  const session = await getSessionUser(request);
  if (!session || session.user.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  // No background job runs in this app, so the grace window is enforced
  // lazily here: anything past it is purged for real the next time an admin
  // opens this tab, then the fresh list is returned.
  //
  // Recipes someone has already bought are never purged: the buyer paid for
  // it, so the row (and their unlocked_recipes record) stays so they keep
  // access and their order history/chef revenue stay intact. It remains
  // hidden from everyone else.
  const purgeIds = await db.query(
    `SELECT r.id FROM recipes r
     WHERE r.status = 'deleted'
       AND r.deleted_at < now() - interval '${RESTORE_WINDOW_DAYS} days'
       AND NOT EXISTS (SELECT 1 FROM unlocked_recipes u WHERE u.recipe_id = r.id)`
  );
  for (const row of purgeIds.rows) {
    await db.query(`DELETE FROM ratings WHERE recipe_id = $1`, [row.id]);
    await db.query(`DELETE FROM favorites WHERE recipe_id = $1`, [row.id]);
    await db.query(`DELETE FROM recipe_reports WHERE recipe_id = $1`, [row.id]);
    await db.query(`DELETE FROM recipes WHERE id = $1`, [row.id]);
  }

  const result = await db.query(
    `SELECT r.id, r.title, r.image_url, r.is_free, r.price_usd, r.rejection_reason, r.deleted_at,
            p.username AS chef_name
     FROM recipes r
     LEFT JOIN profiles p ON p.id = r.chef_id
     WHERE r.status = 'deleted'
     ORDER BY r.deleted_at DESC`
  );

  return Response.json(
    result.rows.map((r) => ({ ...r, restore_window_days: RESTORE_WINDOW_DAYS }))
  );
}
