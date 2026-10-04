import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";

const ADMIN_EMAIL = "feihengkimborat@gmail.com";

export async function GET(request: Request) {
  const session = await getSessionUser(request);
  if (!session || session.user.email !== ADMIN_EMAIL) {
    return Response.json({ error: "Not authorized" }, { status: 403 });
  }

  const chefBreakdown = await db.query(
    `SELECT p.id AS chef_id, p.username AS chef_name,
            COUNT(u.id) AS sales_count,
            COALESCE(SUM(u.price_paid_usd), 0) AS gross_revenue
     FROM profiles p
     JOIN recipes r ON r.chef_id = p.id
     LEFT JOIN unlocked_recipes u ON u.recipe_id = r.id
     WHERE p.account_type = 'chef'
     GROUP BY p.id, p.username
     ORDER BY gross_revenue DESC`
  );

  const topRecipes = await db.query(
    `SELECT r.id, r.title, r.image_url, p.username AS chef_name,
            COUNT(u.id) AS sales_count,
            COALESCE(SUM(u.price_paid_usd), 0) AS gross_revenue
     FROM recipes r
     LEFT JOIN unlocked_recipes u ON u.recipe_id = r.id
     LEFT JOIN profiles p ON p.id = r.chef_id
     WHERE r.status = 'approved' AND r.is_free = false
     GROUP BY r.id, p.username
     ORDER BY gross_revenue DESC
     LIMIT 10`
  );

  const chefs = chefBreakdown.rows.map((c) => {
    const gross = Number(c.gross_revenue);
    return {
      chef_id: c.chef_id,
      chef_name: c.chef_name,
      sales_count: Number(c.sales_count),
      gross_revenue: gross,
      chef_earnings: Math.round(gross * 0.9 * 100) / 100,
      platform_cut: Math.round(gross * 0.1 * 100) / 100,
    };
  });

  const totalRevenue = chefs.reduce((sum, c) => sum + c.gross_revenue, 0);
  const totalSales = chefs.reduce((sum, c) => sum + c.sales_count, 0);
  const totalPlatformCut = chefs.reduce((sum, c) => sum + c.platform_cut, 0);

  return Response.json({
    total_revenue: totalRevenue,
    total_sales: totalSales,
    total_platform_cut: totalPlatformCut,
    chefs,
    top_recipes: topRecipes.rows.map((r) => ({
      id: r.id,
      title: r.title,
      image_url: r.image_url,
      chef_name: r.chef_name,
      sales_count: Number(r.sales_count),
      gross_revenue: Number(r.gross_revenue),
    })),
  });
}