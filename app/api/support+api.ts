import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";
import { notifyOptedIn } from "@/lib/notifications";
import { parseSupportMessage } from "@/lib/support-message";

const ADMIN_EMAIL = "feihengkimborat@gmail.com";

// The signed-in user's own support thread with the admin.
export async function GET(request: Request) {
  const session = await getSessionUser(request);
  if (!session) return Response.json({ error: "Not signed in" }, { status: 401 });

  const result = await db.query(
    `SELECT id, sender, body, image_url, created_at FROM support_messages
     WHERE user_id = $1 ORDER BY created_at ASC, id ASC`,
    [session.user.id]
  );
  await db.query(
    `UPDATE support_messages SET read_by_user = true
     WHERE user_id = $1 AND sender = 'admin' AND read_by_user = false`,
    [session.user.id]
  );
  // Seeing the reply in the chat counts as reading its notification.
  await db.query(
    `UPDATE notifications SET is_read = true
     WHERE user_id = $1 AND type = 'support' AND is_read = false`,
    [session.user.id]
  );
  return Response.json(result.rows);
}

export async function POST(request: Request) {
  const session = await getSessionUser(request);
  if (!session) return Response.json({ error: "Not signed in" }, { status: 401 });

  const parsed = await parseSupportMessage(request);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const result = await db.query(
    `INSERT INTO support_messages (user_id, sender, body, image_url, read_by_user)
     VALUES ($1, 'user', $2, $3, true)
     RETURNING id, sender, body, image_url, created_at`,
    [session.user.id, parsed.text, parsed.imageUrl]
  );
  // One unread alert per thread is enough — don't pile up a notification for
  // every message in a burst.
  const pending = await db.query(
    `SELECT 1 FROM notifications n
     JOIN auth.users u ON u.id::text = n.user_id AND u.email = $1
     WHERE n.type = 'support' AND n.is_read = false AND n.params->>'userId' = $2
       AND n.created_at > now() - interval '1 minute'
     LIMIT 1`,
    [ADMIN_EMAIL, session.user.id]
  );
  if (pending.rows.length === 0) {
    const profile = await db.query(`SELECT username FROM profiles WHERE id = $1`, [session.user.id]);
    const username = profile.rows[0]?.username ?? "A user";
    await notifyOptedIn(
      db,
      { type: "email", email: ADMIN_EMAIL },
      {
        type: "support",
        title: "New support message",
        message: `${username} sent you a message. Tap to reply.`,
        link: "/admin-support",
        params: { audience: "admin", userId: session.user.id, username },
      }
    );
  }

  return Response.json(result.rows[0]);
}
