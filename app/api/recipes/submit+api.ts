import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  const session = await getSessionUser(request);
  if (!session) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const profileResult = await db.query(
    `SELECT account_type FROM profiles WHERE id = $1`,
    [session.user.id]
  );
  if (profileResult.rows[0]?.account_type !== 'chef') {
    return Response.json({ error: "Only chef accounts can submit recipes" }, { status: 403 });
  }

  const body = await request.json();
  const {
    title, description, cuisine, ingredients, steps,
    meal_type, category, is_free, price_usd,
    base64, fileExt, agreedPolicy,
  } = body;

  if (!title || !description || !cuisine || !ingredients || !steps) {
    return Response.json({ error: "Missing required recipe fields" }, { status: 400 });
  }

  // Policy agreement is required for a chef's first 5 submissions (any status)
  const countResult = await db.query(
    `SELECT COUNT(*) AS total FROM recipes WHERE chef_id = $1`,
    [session.user.id]
  );
  const priorSubmissions = Number(countResult.rows[0].total);
  if (priorSubmissions < 5 && agreedPolicy !== true) {
    return Response.json({ error: "You must agree to the 70/30 commission policy" }, { status: 400 });
  }

  let imageUrl: string | null = null;
  if (base64) {
    const buffer = Buffer.from(base64, "base64");
    const fileName = `${session.user.id}-${Date.now()}.${fileExt || "jpg"}`;
    const { error: uploadError } = await supabase.storage
      .from("recipe-photos")
      .upload(fileName, buffer, {
        contentType: `image/${fileExt || "jpeg"}`,
        upsert: true,
      });
    if (uploadError) {
      return Response.json({ error: uploadError.message }, { status: 500 });
    }
    const { data: publicUrlData } = supabase.storage
      .from("recipe-photos")
      .getPublicUrl(fileName);
    imageUrl = publicUrlData.publicUrl;
  }

  const result = await db.query(
    `INSERT INTO recipes
      (title, description, cuisine, ingredients, steps, meal_type, category,
       is_free, price_usd, image_url, chef_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
     RETURNING id`,
    [
      title, description, cuisine, ingredients, steps,
      meal_type, category, !!is_free, is_free ? null : price_usd,
      imageUrl, session.user.id,
    ]
  );

  return Response.json({ success: true, id: result.rows[0].id, status: 'pending' });
}