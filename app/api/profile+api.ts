import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";
export async function GET(request: Request) {
  const session = await getSessionUser(request);
  if (!session) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }
  const result = await db.query(
        `SELECT username, points, avatar_url, account_type, earnings_usd FROM profiles WHERE id = $1`,
    [session.user.id]
  );
  if (!result.rows[0]) {
    return Response.json({ error: "Profile not found" }, { status: 404 });
  }
  return Response.json(result.rows[0]);
}
