import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";

const ADMIN_EMAIL = "feihengkimborat@gmail.com";

// Inbox: one row per user thread, newest activity first.
export async function GET(request: Request) {
  const session = await getSessionUser(request);
  if (!session || session.user.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const result = await db.query(
    `SELECT DISTINCT ON (m.user_id)
            m.user_id, p.username, p.avatar_url,
            m.body AS last_body, m.sender AS last_sender, m.created_at AS last_at,
            (SELECT COUNT(*) FROM support_messages u
             WHERE u.user_id = m.user_id AND u.sender = 'user' AND u.read_by_admin = false)::int AS unread
     FROM support_messages m
     LEFT JOIN profiles p ON p.id::text = m.user_id
     ORDER BY m.user_id, m.created_at DESC, m.id DESC`
  );
  const rows = result.rows.sort(
    (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()
  );
  return Response.json(rows);
}
