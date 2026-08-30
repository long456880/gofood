import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";

export async function POST(request: Request, { id }: Record<string, string>) {
  const session = await getSessionUser(request);
  if (!session) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const recipeResult = await db.query(
    `SELECT chef_id, status FROM recipes WHERE id = $1`,
    [id]
  );
  const recipe = recipeResult.rows[0];
  if (!recipe) {
    return Response.json({ error: "Recipe not found" }, { status: 404 });
  }

  if (recipe.chef_id !== session.user.id) {
    return Response.json({ error: "You can only delete your own recipes" }, { status: 403 });
  }

  if (recipe.status === 'approved') {
    return Response.json({ error: "Approved recipes can't be deleted, since people may have already unlocked them" }, { status: 400 });
  }

  await db.query(`DELETE FROM recipes WHERE id = $1`, [id]);

  return Response.json({ success: true });
}