import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";

// Marks one notification read — used when a banner is tapped, so it doesn't
// keep counting as unread after the user has already acted on it.
export async function POST(request: Request) {
  const session = await getSessionUser(request);
  if (!session) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await request.json().catch(() => ({ id: null }));
  if (!id || typeof id !== "string") {
    return Response.json({ error: "Missing notification id" }, { status: 400 });
  }

  await db.query(
    `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
    [id, session.user.id]
  );

  return Response.json({ success: true });
}
