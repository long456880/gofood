import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";

export async function POST(request: Request, { id }: Record<string, string>) {
  const session = await getSessionUser(request);
  if (!session) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json();
  const { rating } = body;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return Response.json({ error: "Rating must be a whole number from 1 to 5" }, { status: 400 });
  }

  await db.query(
    `INSERT INTO ratings (user_id, recipe_id, rating)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, recipe_id)
     DO UPDATE SET rating = $3`,
    [session.user.id, id, rating]
  );

  const avgResult = await db.query(
    `SELECT COALESCE(AVG(rating), 0) AS avg_rating, COUNT(*) AS rating_count
     FROM ratings WHERE recipe_id = $1`,
    [id]
  );

  return Response.json({
    success: true,
    avg_rating: Number(avgResult.rows[0].avg_rating),
    rating_count: Number(avgResult.rows[0].rating_count),
  });
}