import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getSessionUser(request);
  if (!session) return Response.json({ error: "Not signed in" }, { status: 401 });

  const body = await request.json();
  const { accountType } = body;

  if (accountType !== 'chef' && accountType !== 'home_cook') {
    return Response.json({ error: "Invalid account type" }, { status: 400 });
  }

  await db.query(
    `UPDATE profiles SET account_type = $1 WHERE id = $2`,
    [accountType, session.user.id]
  );

  return Response.json({ success: true, accountType });
}