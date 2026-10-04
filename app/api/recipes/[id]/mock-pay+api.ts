import { getSessionUser } from "@/lib/supabase-server";
import { creditRecipePurchase } from "@/lib/recipe-purchase";

// Simulated card payment for demo purposes — no real card processor is
// involved and no charge actually happens. It credits the purchase exactly
// like a verified Bakong payment would, so the rest of the app (unlocked
// recipes, chef earnings, admin dashboard) can't tell the two apart.
export async function POST(request: Request, { id }: Record<string, string>) {
  const session = await getSessionUser(request);
  if (!session) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    await creditRecipePurchase(session.user.id, id);
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to unlock";
    const status = message === "Recipe not found" ? 404 : 500;
    return Response.json({ error: message }, { status });
  }
}
