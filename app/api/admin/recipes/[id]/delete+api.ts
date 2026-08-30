import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";

const ADMIN_EMAIL = "feihengkimborat@gmail.com";

export async function POST(request: Request, { id }: { id: string }) {
  const session = await getSessionUser(request);
  if (!session || session.user.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  await db.query(`DELETE FROM ratings WHERE recipe_id = $1`, [id]);
  await db.query(`DELETE FROM favorites WHERE recipe_id = $1`, [id]);
  await db.query(`DELETE FROM unlocked_recipes WHERE recipe_id = $1`, [id]);
  await db.query(`DELETE FROM recipes WHERE id = $1`, [id]);

  return Response.json({ success: true });
}