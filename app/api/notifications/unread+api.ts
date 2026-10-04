import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";

// Lightweight poll for the in-app banner and the bell badge. Unlike
// GET /api/notifications this never marks anything as read — opening the
// notifications page (or tapping a banner) does that.
export async function GET(request: Request) {
  const session = await getSessionUser(request);
  if (!session) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const [countResult, latestResult] = await Promise.all([
    db.query(
      `SELECT count(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false`,
      [session.user.id]
    ),
    db.query(
      `SELECT id, type, title, message, link, params, created_at
       FROM notifications
       WHERE user_id = $1 AND is_read = false
       ORDER BY created_at DESC
       LIMIT 5`,
      [session.user.id]
    ),
  ]);

  return Response.json({ count: countResult.rows[0].count, latest: latestResult.rows });
}
