import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getSessionUser(request);
  if (!session) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const { enabled } = await request.json();

  await db.query(
    `UPDATE profiles SET notifications_enabled = $1 WHERE id = $2`,
    [!!enabled, session.user.id]
  );

  return Response.json({ success: true, enabled: !!enabled });
}