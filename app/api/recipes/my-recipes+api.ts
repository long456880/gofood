import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getSessionUser(request);
  if (!session) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const result = await db.query(
        `SELECT id, title, image_url, status, price_usd, is_free, created_at, rejection_reason
     FROM recipes
     WHERE chef_id = $1
     ORDER BY created_at DESC`,
    [session.user.id]
  );

  return Response.json({
    recipes: result.rows,
    totalCount: result.rows.length,
  });
}