import { db } from "@/lib/db";
import { notifyOptedIn } from "@/lib/notifications";

const ADMIN_EMAIL = "feihengkimborat@gmail.com";

// Grants a user ownership of a paid recipe and credits the chef's cut.
// Call this only after a payment has actually been verified — it does not
// check payment status itself.
export async function creditRecipePurchase(userId: string, recipeId: string) {
  const recipeResult = await db.query(
    `SELECT title, price_usd, chef_id FROM recipes WHERE id = $1`,
    [recipeId]
  );
  const recipe = recipeResult.rows[0];
  if (!recipe) {
    throw new Error("Recipe not found");
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const insertResult = await client.query(
      `INSERT INTO unlocked_recipes (user_id, recipe_id, price_paid_usd) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, recipe_id) DO NOTHING`,
      [userId, recipeId, recipe.price_usd]
    );

    if (insertResult.rowCount === 0) {
      // Already unlocked (retry/double-tap) — skip earnings credit and notifications.
      await client.query("COMMIT");
      return;
    }

    // Chef commission: 90% of the price goes to whoever created the recipe
    if (recipe.chef_id) {
      const chefCut = Math.round(Number(recipe.price_usd) * 0.9 * 100) / 100;
      await client.query(
        `UPDATE profiles SET earnings_usd = earnings_usd + $1 WHERE id = $2`,
        [chefCut, recipe.chef_id]
      );

      await notifyOptedIn(client, { type: 'user', userId: recipe.chef_id }, {
        type: 'purchase',
        title: 'Recipe purchased!',
        message: `Someone bought "${recipe.title}" for $${Number(recipe.price_usd).toFixed(2)}.`,
        link: `/recipe/${recipeId}`,
        params: { audience: 'chef', title: recipe.title, price: Number(recipe.price_usd).toFixed(2) },
      });
    }

    await notifyOptedIn(client, { type: 'email', email: ADMIN_EMAIL }, {
      type: 'purchase',
      title: 'Recipe purchased!',
      message: `"${recipe.title}" was purchased for $${Number(recipe.price_usd).toFixed(2)}.`,
      link: `/recipe/${recipeId}`,
      params: { audience: 'admin', title: recipe.title, price: Number(recipe.price_usd).toFixed(2) },
    });

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
