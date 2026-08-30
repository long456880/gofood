import { createClient } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const session = await getSessionUser(request);
  if (!session) return Response.json({ error: "Not signed in" }, { status: 401 });

  const body = await request.json();
  const { username, currentPassword, newPassword } = body;

  if (username) {
    await db.query(
      `UPDATE profiles SET username = $1 WHERE id = $2`,
      [username, session.user.id]
    );
  }

  if (currentPassword && newPassword) {
    const supabase = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL!,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: session.user.email!,
      password: currentPassword,
    });
    if (signInError) {
      return Response.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 400 });
    }
  }

  return Response.json({ success: true });
}