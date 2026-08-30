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

  const { base64, fileExt } = await request.json();
  if (!base64) {
    return Response.json({ error: "No image provided" }, { status: 400 });
  }

  const buffer = Buffer.from(base64, "base64");
  const fileName = `${session.user.id}-${Date.now()}.${fileExt || "jpg"}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, buffer, {
      contentType: `image/${fileExt || "jpeg"}`,
      upsert: true,
    });

  if (uploadError) {
    return Response.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(fileName);

  const avatarUrl = publicUrlData.publicUrl;

  await db.query(`UPDATE profiles SET avatar_url = $1 WHERE id = $2`, [
    avatarUrl,
    session.user.id,
  ]);

  return Response.json({ avatar_url: avatarUrl });
}