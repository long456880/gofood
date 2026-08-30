import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";

const ADMIN_EMAIL = "feihengkimborat@gmail.com";

export async function GET(request: Request, { id }: Record<string, string>) {
  const session = await getSessionUser(request);
  const result = await db.query(
    `SELECT r.id, r.title, r.description, r.description_km, r.cuisine, r.image_url,
            r.progress_image_1, r.progress_image_2, r.is_free, r.point_cost, r.price_usd,
            r.ingredients, r.ingredients_km, r.steps, r.steps_km, r.chef_id, r.status,
            p.username AS chef_name,
            COALESCE(AVG(rt.rating), 0) AS avg_rating,
            COUNT(rt.id) AS rating_count
     FROM recipes r
     LEFT JOIN profiles p ON p.id = r.chef_id
     LEFT JOIN ratings rt ON rt.recipe_id = r.id
     WHERE r.id = $1
     GROUP BY r.id, p.username`,
    [id]
  );
  const recipe = result.rows[0];
  if (!recipe) {
    return Response.json({ error: "Recipe not found" }, { status: 404 });
  }

  let myRating: number | null = null;
  if (session) {
    const myRatingResult = await db.query(
      `SELECT rating FROM ratings WHERE user_id = $1 AND recipe_id = $2`,
      [session.user.id, id]
    );
    myRating = myRatingResult.rows[0]?.rating ?? null;
  }

  // Non-approved recipes are only visible to the chef who made them or the admin
  if (recipe.status !== 'approved') {
    const isOwner = session && session.user.id === recipe.chef_id;
    const isAdmin = session && session.user.email === ADMIN_EMAIL;
    if (!isOwner && !isAdmin) {
      return Response.json({ error: "Recipe not found" }, { status: 404 });
    }
  }

  if (recipe.is_free) {
    return Response.json({ ...recipe, locked: false, my_rating: myRating });
  }
  if (session) {
    const unlocked = await db.query(
      `SELECT 1 FROM unlocked_recipes WHERE user_id = $1 AND recipe_id = $2`,
      [session.user.id, id]
    );
    if (unlocked.rows.length > 0) {
      return Response.json({ ...recipe, locked: false, my_rating: myRating });
    }
  }
  const { ingredients, ingredients_km, steps, steps_km, ...locked } = recipe;
  return Response.json({ ...locked, locked: true, my_rating: myRating });
}