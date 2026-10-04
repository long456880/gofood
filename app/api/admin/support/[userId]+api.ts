import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";
import { notifyOptedIn } from "@/lib/notifications";
import { parseSupportMessage } from "@/lib/support-message";

const ADMIN_EMAIL = "feihengkimborat@gmail.com";

export async function GET(request: Request, { userId }: { userId: string }) {
  const session = await getSessionUser(request);
  if (!session || session.user.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const result = await db.query(
    `SELECT id, sender, body, image_url, created_at FROM support_messages
     WHERE user_id = $1 ORDER BY created_at ASC, id ASC`,
    [userId]
  );
  await db.query(
    `UPDATE support_messages SET read_by_admin = true
     WHERE user_id = $1 AND sender = 'user' AND read_by_admin = false`,
    [userId]
  );
  return Response.json(result.rows);
}

export async function POST(request: Request, { userId }: { userId: string }) {
  const session = await getSessionUser(request);
  if (!session || session.user.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const parsed = await parseSupportMessage(request);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const result = await db.query(
    `INSERT INTO support_messages (user_id, sender, body, image_url, read_by_admin)
     VALUES ($1, 'admin', $2, $3, true)
     RETURNING id, sender, body, image_url, created_at`,
    [userId, parsed.text, parsed.imageUrl]
  );
  const pending = await db.query(
    `SELECT 1 FROM notifications
     WHERE user_id = $1 AND type = 'support' AND is_read = false LIMIT 1`,
    [userId]
  );
  if (pending.rows.length === 0) {
    await notifyOptedIn(
      db,
      { type: "user", userId },
      {
        type: "support",
        title: "New reply from support",
        message: "The admin replied to your message. Tap to read it.",
        link: "/support-chat",
        params: { audience: "user" },
      }
    );
  }

  return Response.json(result.rows[0]);
}
