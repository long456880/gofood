import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";

const ADMIN_EMAIL = "feihengkimborat@gmail.com";

export async function POST(request: Request, { id }: Record<string, string>) {
  const session = await getSessionUser(request);
  if (!session || session.user.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const { action, reason } = await request.json();
  if (action !== 'approve' && action !== 'reject') {
    return Response.json({ error: "Action must be 'approve' or 'reject'" }, { status: 400 });
  }

  if (action === 'reject' && !reason) {
    return Response.json({ error: "A rejection reason is required" }, { status: 400 });
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  await db.query(
    `UPDATE recipes SET status = $1, rejection_reason = $2 WHERE id = $3`,
    [newStatus, action === 'reject' ? reason : null, id]
  );

  return Response.json({ success: true, status: newStatus });
}