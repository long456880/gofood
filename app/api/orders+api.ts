import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getSessionUser(request);
  if (!session) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const result = await db.query(
    `SELECT u.id, u.unlocked_at, u.price_paid_usd,
            r.id AS recipe_id, r.title, r.image_url, r.cuisine,
            p.username AS chef_name
     FROM unlocked_recipes u
     JOIN recipes r ON r.id = u.recipe_id
     LEFT JOIN profiles p ON p.id = r.chef_id
     WHERE u.user_id = $1
     ORDER BY u.unlocked_at DESC`,
    [session.user.id]
  );

  return Response.json(result.rows);
}