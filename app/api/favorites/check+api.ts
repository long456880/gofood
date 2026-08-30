import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getSessionUser(request);
  if (!session) return Response.json({ favorited: false });

  const url = new URL(request.url);
  const recipeId = url.searchParams.get('recipeId');
  if (!recipeId) return Response.json({ favorited: false });

  const result = await db.query(
    `SELECT 1 FROM favorites WHERE user_id = $1 AND recipe_id = $2`,
    [session.user.id, recipeId]
  );

  return Response.json({ favorited: result.rows.length > 0 });
}