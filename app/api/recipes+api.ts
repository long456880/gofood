import { db } from "@/lib/db";

export async function GET() {
  const result = await db.query(
    `SELECT r.id, r.title, r.description, r.cuisine, r.image_url, r.progress_image_1, r.progress_image_2,
            r.is_free, r.point_cost,
            r.price_usd, r.meal_type, r.category, r.chef_id, p.username AS chef_name,
            COALESCE(AVG(rt.rating), 0) AS avg_rating,
            COUNT(rt.id) AS rating_count
     FROM recipes r
     LEFT JOIN profiles p ON p.id = r.chef_id
     LEFT JOIN ratings rt ON rt.recipe_id = r.id
     WHERE r.status = 'approved'
     GROUP BY r.id, p.username
     ORDER BY r.created_at DESC`
  );
  return Response.json(result.rows);
}