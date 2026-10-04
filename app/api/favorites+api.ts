import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getSessionUser(request);
  if (!session) return Response.json({ error: "Not signed in" }, { status: 401 });

    const result = await db.query(
    `SELECT r.id, r.title, r.description, r.cuisine, r.is_free, r.point_cost, r.price_usd, r.image_url,
     r.progress_image_1, r.progress_image_2, r.category,
     r.chef_id, p.username AS chef_name,
     COALESCE(AVG(rt.rating), 0) AS avg_rating,
     COUNT(rt.id) AS rating_count,
     EXISTS(SELECT 1 FROM unlocked_recipes u WHERE u.user_id = $1 AND u.recipe_id = r.id) as owned
     FROM favorites f
     JOIN recipes r ON r.id = f.recipe_id
     LEFT JOIN profiles p ON p.id = r.chef_id
     LEFT JOIN ratings rt ON rt.recipe_id = r.id
     WHERE f.user_id = $1 AND r.status = 'approved'
     GROUP BY r.id, p.username, f.created_at
     ORDER BY f.created_at DESC`,
    [session.user.id]
  );

  return Response.json(result.rows);
}

export async function POST(request: Request) {
  const session = await getSessionUser(request);
  if (!session) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { recipeId } = await request.json();

  const existing = await db.query(
    `SELECT id FROM favorites WHERE user_id = $1 AND recipe_id = $2`,
    [session.user.id, recipeId]
  );

  if (existing.rows.length > 0) {
    await db.query(
      `DELETE FROM favorites WHERE user_id = $1 AND recipe_id = $2`,
      [session.user.id, recipeId]
    );
    return Response.json({ favorited: false });
  }

  await db.query(
    `INSERT INTO favorites (user_id, recipe_id) VALUES ($1, $2)`,
    [session.user.id, recipeId]
  );
  return Response.json({ favorited: true });
}