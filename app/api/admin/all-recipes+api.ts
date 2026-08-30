import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";

const ADMIN_EMAIL = "feihengkimborat@gmail.com";

export async function GET(request: Request) {
  const session = await getSessionUser(request);
  if (!session || session.user.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const result = await db.query(
    `SELECT r.id, r.title, r.description, r.cuisine, r.image_url, r.is_free, r.price_usd,
            r.meal_type, r.category, r.ingredients, r.steps, r.created_at, r.status,
            p.username AS chef_name
     FROM recipes r
     LEFT JOIN profiles p ON p.id = r.chef_id
     ORDER BY r.created_at DESC`
  );
  return Response.json(result.rows);
}