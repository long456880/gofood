import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";
import { generatePaymentQR } from "@/lib/bakong";

// Issues a fresh Bakong KHQR code for buying a paid recipe. The frontend
// shows this as a QR and polls /unlock with the returned md5 until it's paid.
export async function POST(request: Request, { id }: Record<string, string>) {
  const session = await getSessionUser(request);
  if (!session) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const recipeResult = await db.query(
    `SELECT price_usd FROM recipes WHERE id = $1`,
    [id]
  );
  const recipe = recipeResult.rows[0];
  if (!recipe) {
    return Response.json({ error: "Recipe not found" }, { status: 404 });
  }

  const amount = Number(recipe.price_usd ?? 0);
  if (amount <= 0) {
    return Response.json({ error: "This recipe isn't payable" }, { status: 400 });
  }

  try {
    const payment = generatePaymentQR(amount, id.slice(0, 25));
    return Response.json(payment);
  } catch (err) {
    console.error("KHQR generation failed:", err);
    const message = err instanceof Error ? err.message : "Failed to create payment";
    return Response.json({ error: message }, { status: 500 });
  }
}
