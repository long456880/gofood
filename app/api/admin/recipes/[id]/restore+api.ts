import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";
import { notifyOptedIn } from "@/lib/notifications";

const ADMIN_EMAIL = "feihengkimborat@gmail.com";

// Undoes a takedown within the grace window — puts the recipe back live
// and clears the reason so My Recipes stops showing it as removed.
export async function POST(request: Request, { id }: { id: string }) {
  const session = await getSessionUser(request);
  if (!session || session.user.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const result = await db.query(
    `UPDATE recipes SET status = 'approved', deleted_at = null, rejection_reason = null
     WHERE id = $1 AND status = 'deleted'
     RETURNING title, chef_id`,
    [id]
  );
  const recipe = result.rows[0];
  if (!recipe) {
    return Response.json({ error: "Recipe not found" }, { status: 404 });
  }

  if (recipe.chef_id) {
    await notifyOptedIn(db, { type: 'user', userId: recipe.chef_id }, {
      type: 'restoration',
      title: 'Recipe restored',
      message: `Good news — your recipe "${recipe.title}" was restored and is live again on GoFood.`,
      link: `/recipe/${id}`,
      params: { title: recipe.title },
    });
  }

  return Response.json({ success: true });
}
