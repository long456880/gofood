import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";

const ADMIN_EMAIL = "feihengkimborat@gmail.com";

export async function GET(request: Request) {
  const session = await getSessionUser(request);
  if (!session || session.user.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const result = await db.query(
    `SELECT r.id, r.title, r.image_url, r.is_free, r.price_usd, r.status,
            p.username AS chef_name,
            COUNT(rr.id) AS report_count,
            MAX(rr.created_at) AS last_reported_at,
            (array_agg(rr.reason ORDER BY rr.created_at DESC))[1] AS latest_reason,
            array_agg(DISTINCT rr.reason) AS reasons
     FROM recipe_reports rr
     JOIN recipes r ON r.id = rr.recipe_id
     LEFT JOIN profiles p ON p.id = r.chef_id
     WHERE rr.status = 'open'
     GROUP BY r.id, p.username
     ORDER BY last_reported_at DESC`
  );
  return Response.json(result.rows);
}
