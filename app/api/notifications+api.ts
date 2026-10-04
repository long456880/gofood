import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getSessionUser(request);
  if (!session) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const result = await db.query(
    `SELECT id, type, title, message, link, params, is_read, created_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [session.user.id]
  );

  const ids = result.rows.map((row) => row.id);
  if (ids.length > 0) {
    await db.query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND id = ANY($2)`,
      [session.user.id, ids]
    );
  }

  return Response.json(result.rows);
}