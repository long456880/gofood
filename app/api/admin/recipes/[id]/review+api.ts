import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";
import { notifyOptedIn } from "@/lib/notifications";
const ADMIN_EMAIL = "feihengkimborat@gmail.com";
export async function POST(request: Request, { id }: Record<string, string>) {
  const session = await getSessionUser(request);
  if (!session || session.user.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }
  const { action, reason } = await request.json();
  if (action !== 'approve' && action !== 'reject') {
    return Response.json({ error: "Action must be 'approve' or 'reject'" }, { status: 400 });
  }
  if (action === 'reject' && !reason) {
    return Response.json({ error: "A rejection reason is required" }, { status: 400 });
  }
  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  const result = await db.query(
    `UPDATE recipes SET status = $1, rejection_reason = $2 WHERE id = $3
     RETURNING title, cuisine, chef_id`,
    [newStatus, action === 'reject' ? reason : null, id]
  );
  const recipe = result.rows[0];

  if (action === 'approve' && recipe) {
    await notifyOptedIn(db, { type: 'all' }, {
      type: 'new_recipe',
      title: 'New recipe added!',
      message: `Check out "${recipe.title}" — now available in the ${recipe.cuisine} collection.`,
      link: `/recipe/${id}`,
      params: { title: recipe.title, cuisine: recipe.cuisine },
    });

    if (recipe.chef_id) {
      await notifyOptedIn(db, { type: 'user', userId: recipe.chef_id }, {
        type: 'approval',
        title: 'Recipe approved!',
        message: `Your recipe "${recipe.title}" is now live on GoFood.`,
        link: `/recipe/${id}`,
        params: { title: recipe.title },
      });
    }
  }

  // Send the recipe back to the chef with the reason, so they find out
  // without having to keep checking My Recipes and know what to fix.
  if (action === 'reject' && recipe?.chef_id) {
    await notifyOptedIn(db, { type: 'user', userId: recipe.chef_id }, {
      type: 'rejection',
      title: 'Recipe needs changes',
      message: `Your recipe "${recipe.title}" wasn't approved: ${reason}`,
      link: `/my-recipes`,
      params: { title: recipe.title, reason },
    });
  }

  return Response.json({ success: true, status: newStatus });
}