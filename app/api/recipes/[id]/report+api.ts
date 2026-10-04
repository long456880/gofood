import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";
import { notifyOptedIn } from "@/lib/notifications";

const ADMIN_EMAIL = "feihengkimborat@gmail.com";

// Lets a regular (home_cook) user flag a recipe as a possible copy of
// someone else's work. Chefs can't report through this route — copying
// disputes between chefs are for the admin to sort out during review, not
// something one chef can use to flag another's listing.
export async function POST(request: Request, { id }: Record<string, string>) {
  const session = await getSessionUser(request);
  if (!session) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const profileResult = await db.query(
    `SELECT account_type, username FROM profiles WHERE id = $1`,
    [session.user.id]
  );
  const profile = profileResult.rows[0];
  if (!profile || profile.account_type !== 'home_cook') {
    return Response.json({ error: "Only users can report recipes" }, { status: 403 });
  }

  const { reason } = await request.json().catch(() => ({ reason: null }));
  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    return Response.json({ error: "A reason is required" }, { status: 400 });
  }

  const recipeResult = await db.query(
    `SELECT title, chef_id FROM recipes WHERE id = $1 AND status = 'approved'`,
    [id]
  );
  const recipe = recipeResult.rows[0];
  if (!recipe) {
    return Response.json({ error: "Recipe not found" }, { status: 404 });
  }

  const insertResult = await db.query(
    `INSERT INTO recipe_reports (recipe_id, reporter_id, reason) VALUES ($1, $2, $3)
     ON CONFLICT (recipe_id, reporter_id) DO NOTHING
     RETURNING id`,
    [id, session.user.id, reason.trim()]
  );

  if (insertResult.rowCount === 0) {
    return Response.json({ error: "You've already reported this recipe" }, { status: 409 });
  }

  await notifyOptedIn(db, { type: 'email', email: ADMIN_EMAIL }, {
    type: 'report',
    title: 'Recipe reported',
    message: `"${recipe.title}" was reported by ${profile.username ?? 'a user'}: ${reason.trim()}`,
    link: '/admin-review?tab=reports',
    params: { title: recipe.title, username: profile.username, reason: reason.trim() },
  });

  return Response.json({ success: true });
}
