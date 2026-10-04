import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";

const ADMIN_EMAIL = "feihengkimborat@gmail.com";

// Admin looked into the report(s) for this recipe and decided it's not a
// copy — clears it from the reports queue without touching the recipe.
export async function POST(request: Request, { recipeId }: Record<string, string>) {
  const session = await getSessionUser(request);
  if (!session || session.user.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  await db.query(
    `UPDATE recipe_reports SET status = 'dismissed' WHERE recipe_id = $1 AND status = 'open'`,
    [recipeId]
  );

  return Response.json({ success: true });
}
