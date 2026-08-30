import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await getSessionUser(request);
  if (!session) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const profileResult = await db.query(
    `SELECT account_type, earnings_usd FROM profiles WHERE id = $1`,
    [session.user.id]
  );
  if (profileResult.rows[0]?.account_type !== 'chef') {
    return Response.json({ error: "Only chef accounts have a sales dashboard" }, { status: 403 });
  }

  const recipesResult = await db.query(
    `SELECT r.id, r.title, r.image_url, r.price_usd, r.is_free, r.status,
            COUNT(u.id) AS sales_count,
            COALESCE(SUM(u.price_paid_usd), 0) AS gross_revenue
     FROM recipes r
     LEFT JOIN unlocked_recipes u ON u.recipe_id = r.id
     WHERE r.chef_id = $1 AND r.status = 'approved' AND r.is_free = false
     GROUP BY r.id
     ORDER BY gross_revenue DESC`,
    [session.user.id]
  );

  const recipes = recipesResult.rows.map((r) => ({
    id: r.id,
    title: r.title,
    image_url: r.image_url,
    price_usd: r.price_usd,
    sales_count: Number(r.sales_count),
    gross_revenue: Number(r.gross_revenue),
    your_earnings: Math.round(Number(r.gross_revenue) * 0.7 * 100) / 100,
  }));

  const totalSales = recipes.reduce((sum, r) => sum + r.sales_count, 0);

  return Response.json({
    total_earnings: Number(profileResult.rows[0].earnings_usd ?? 0),
    total_sales: totalSales,
    recipes,
  });
}