import { getSessionUser } from "@/lib/supabase-server";
import { db } from "@/lib/db";
import { notifyOptedIn } from "@/lib/notifications";
import { translateToKhmer, translateIngredientsToKhmer } from "@/lib/translate";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const ADMIN_EMAIL = "feihengkimborat@gmail.com";
const MIN_PRICE = 0.99;
const MAX_PRICE = 4.99;

export async function POST(request: Request) {
  const session = await getSessionUser(request);
  if (!session) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const profileResult = await db.query(
    `SELECT account_type, username FROM profiles WHERE id = $1`,
    [session.user.id]
  );
  if (profileResult.rows[0]?.account_type !== 'chef') {
    return Response.json({ error: "Only chef accounts can submit recipes" }, { status: 403 });
  }

  const body = await request.json();
  const {
    title, description, cuisine, ingredients, steps,
    meal_type, category, is_free, price_usd,
    images, agreedPolicy,
  } = body;

  if (!title || !description || !cuisine || !ingredients || !steps) {
    return Response.json({ error: "Missing required recipe fields" }, { status: 400 });
  }

  if (!is_free) {
    const price = Number(price_usd);
    if (!Number.isFinite(price) || price < MIN_PRICE || price > MAX_PRICE) {
      return Response.json(
        { error: `Price must be between $${MIN_PRICE.toFixed(2)} and $${MAX_PRICE.toFixed(2)}` },
        { status: 400 }
      );
    }
  }

  // Every submission needs a fresh agreement — not just a chef's first few —
  // so the 90/10 split stays front of mind instead of being a one-time notice.
  // The admin account is the platform itself, so it has no commission to agree to.
  if (session.user.email !== ADMIN_EMAIL && agreedPolicy !== true) {
    return Response.json({ error: "You must agree to the 90/10 commission policy" }, { status: 400 });
  }

  const imageInputs: { base64: string; fileExt?: string }[] = Array.isArray(images)
    ? images.filter((img) => img && img.base64).slice(0, 3)
    : [];

  const uploadedUrls: (string | null)[] = [];
  for (const img of imageInputs) {
    const buffer = Buffer.from(img.base64, "base64");
    const fileName = `${session.user.id}-${Date.now()}-${uploadedUrls.length}.${img.fileExt || "jpg"}`;
    const { error: uploadError } = await supabase.storage
      .from("recipe-photos")
      .upload(fileName, buffer, {
        contentType: `image/${img.fileExt || "jpeg"}`,
        upsert: true,
      });
    if (uploadError) {
      return Response.json({ error: uploadError.message }, { status: 500 });
    }
    const { data: publicUrlData } = supabase.storage
      .from("recipe-photos")
      .getPublicUrl(fileName);
    uploadedUrls.push(publicUrlData.publicUrl);
  }
  const [imageUrl = null, progressImage1 = null, progressImage2 = null] = uploadedUrls;

  // Auto-fill the Khmer columns from the English text the chef just typed —
  // best-effort: a chef's recipe should still publish even if the
  // translation API is down or unconfigured, so failures here only mean the
  // recipe falls back to showing English to Khmer-language viewers, not a
  // failed submission (see displayDescription/etc. in recipe/[id].tsx).
  let descriptionKm: string | null = null;
  let ingredientsKm: string | null = null;
  let stepsKm: string | null = null;
  try {
    // Ingredients are translated item-by-item (not as one joined blob) so the
    // comma-separated structure the ingredient list relies on survives —
    // see translateIngredientsToKhmer for why that matters.
    const [translatedDescription, translatedSteps] = await translateToKhmer([description, steps]);
    descriptionKm = translatedDescription;
    stepsKm = translatedSteps;
    ingredientsKm = await translateIngredientsToKhmer(ingredients);
  } catch (err) {
    console.error("Khmer translation failed:", err);
  }

  // The admin account is also the one that approves the review queue, so a
  // recipe it submits would just be sitting there waiting for itself to
  // approve it. Skip straight to published for that one account only —
  // every other chef still goes through the normal review queue.
  const isAdminChef = session.user.email === ADMIN_EMAIL;
  const initialStatus = isAdminChef ? 'approved' : 'pending';

  const result = await db.query(
    `INSERT INTO recipes
      (title, description, cuisine, ingredients, steps, meal_type, category,
       is_free, price_usd, image_url, progress_image_1, progress_image_2, chef_id, status,
       description_km, ingredients_km, steps_km)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
     RETURNING id`,
    [
      title, description, cuisine, ingredients, steps,
      meal_type, category, !!is_free, is_free ? null : price_usd,
      imageUrl, progressImage1, progressImage2, session.user.id, initialStatus,
      descriptionKm, ingredientsKm, stepsKm,
    ]
  );

  // Mirrors the "new recipe" announcement the review screen sends on manual
  // approval — otherwise an auto-published recipe would never get one.
  if (isAdminChef) {
    await notifyOptedIn(db, { type: 'all' }, {
      type: 'new_recipe',
      title: 'New recipe added!',
      message: `Check out "${title.trim()}" — now available in the ${cuisine} collection.`,
      link: `/recipe/${result.rows[0].id}`,
      params: { title: title.trim(), cuisine },
    });
  }

  // Everyone else's recipe waits in the review queue, so tell the admin
  // there's something to check.
  if (!isAdminChef) {
    const chefName = profileResult.rows[0]?.username ?? 'A chef';
    await notifyOptedIn(db, { type: 'email', email: ADMIN_EMAIL }, {
      type: 'review_request',
      title: 'Recipe waiting for review',
      message: `${chefName} submitted "${title.trim()}" for review. Please go check and review it.`,
      link: '/admin-review',
      params: { title: title.trim(), chef: chefName },
    });
  }

  return Response.json({ success: true, id: result.rows[0].id, status: initialStatus });
}