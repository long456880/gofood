import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";
import { notifyOptedIn } from "@/lib/notifications";

const ADMIN_EMAIL = "feihengkimborat@gmail.com";
const RESTORE_WINDOW_DAYS = 3;

// Soft-deletes so a mistaken takedown (or a chef who disputes the report)
// can still be undone — the recipe is hidden from everyone immediately, but
// the row itself isn't gone until the grace window passes (see
// deleted-recipes+api.ts, which purges anything past that window).
export async function POST(request: Request, { id }: { id: string }) {
  const session = await getSessionUser(request);
  if (!session || session.user.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const { reason } = await request.json().catch(() => ({ reason: null }));
  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    return Response.json({ error: "A reason is required" }, { status: 400 });
  }

  const result = await db.query(
    `UPDATE recipes SET status = 'deleted', deleted_at = now(), rejection_reason = $1
     WHERE id = $2
     RETURNING title, chef_id`,
    [reason.trim(), id]
  );
  const recipe = result.rows[0];
  if (!recipe) {
    return Response.json({ error: "Recipe not found" }, { status: 404 });
  }

  // The takedown is the resolution — any open reports on it no longer need
  // admin attention, so clear them out of the reports queue.
  await db.query(
    `UPDATE recipe_reports SET status = 'dismissed' WHERE recipe_id = $1 AND status = 'open'`,
    [id]
  );

  if (recipe.chef_id) {
    await notifyOptedIn(db, { type: 'user', userId: recipe.chef_id }, {
      type: 'deletion',
      title: 'Recipe removed',
      message: `Your recipe "${recipe.title}" was removed: ${reason.trim()}. It'll be permanently deleted in ${RESTORE_WINDOW_DAYS} days — contact us if you think this is a mistake.`,
      link: '/my-recipes',
      params: { title: recipe.title, reason: reason.trim(), days: RESTORE_WINDOW_DAYS },
    });
  }

  return Response.json({ success: true });
}