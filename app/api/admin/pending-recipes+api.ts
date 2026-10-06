import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";
import { findClosestRecipes, SIMILARITY_THRESHOLD } from "@/lib/recipe-similarity";

const ADMIN_EMAIL = "feihengkimborat@gmail.com";

export async function GET(request: Request) {
  const session = await getSessionUser(request);
  if (!session || session.user.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const [pendingResult, otherResult] = await Promise.all([
    db.query(
      `SELECT r.id, r.title, r.description, r.cuisine, r.image_url, r.progress_image_1, r.progress_image_2, r.is_free, r.price_usd,
              r.meal_type, r.category, r.ingredients, r.steps, r.created_at, r.chef_id,
              p.username AS chef_name
       FROM recipes r
       LEFT JOIN profiles p ON p.id = r.chef_id
       WHERE r.status = 'pending'
       ORDER BY r.created_at ASC`
    ),
    // Everything else already on the platform, to check pending submissions
    // against for copied ingredients/steps.
    db.query(
      `SELECT r.id, r.title, r.ingredients, r.steps, r.created_at, r.chef_id,
              p.username AS chef_name
       FROM recipes r
       LEFT JOIN profiles p ON p.id = r.chef_id
       WHERE r.status != 'pending'`
    ),
  ]);

  const recipes = pendingResult.rows.map((recipe) => {
    const otherChefsRecipes = otherResult.rows.filter((r) => r.chef_id !== recipe.chef_id);
    const similar_recipes = findClosestRecipes(recipe, otherChefsRecipes);
    const possible_matches = similar_recipes.filter((m) => m.score >= SIMILARITY_THRESHOLD);
    return { ...recipe, similar_recipes, possible_matches };
  });

  return Response.json(recipes);
}