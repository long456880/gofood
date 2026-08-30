import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";

export async function POST(request: Request, { id }: Record<string, string>) {
  const session = await getSessionUser(request);
  if (!session) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const recipeResult = await db.query(
    `SELECT price_usd, chef_id FROM recipes WHERE id = $1`,
    [id]
  );
  const recipe = recipeResult.rows[0];
  if (!recipe) {
    return Response.json({ error: "Recipe not found" }, { status: 404 });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Mock payment: no real card is charged here — this instantly "succeeds"
    // once the person confirms on the fake pay screen.
    await client.query(
      `INSERT INTO unlocked_recipes (user_id, recipe_id, price_paid_usd) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, recipe_id) DO NOTHING`,
      [session.user.id, id, recipe.price_usd]
    );

    // Chef commission: 70% of the price goes to whoever created the recipe
    if (recipe.chef_id) {
      const chefCut = Math.round(Number(recipe.price_usd) * 0.7 * 100) / 100;
      await client.query(
        `UPDATE profiles SET earnings_usd = earnings_usd + $1 WHERE id = $2`,
        [chefCut, recipe.chef_id]
      );
    }

    await client.query("COMMIT");
    return Response.json({ success: true });
    } catch (err) {
    await client.query("ROLLBACK");
    console.error("Unlock failed:", err);
    return Response.json({ error: "Failed to unlock" }, { status: 500 });
  } finally {
    client.release();
  }
}