import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "heic"];

type Parsed =
  | { ok: true; text: string; imageUrl: string | null }
  | { ok: false; error: string };

// Shared by the user and admin send routes: validates the text, uploads the
// optional image to the existing "avatars" bucket under support/ with an
// unguessable name, and returns the public URL to store on the message.
export async function parseSupportMessage(request: Request): Promise<Parsed> {
  const { body, base64, fileExt } = await request.json().catch(() => ({} as any));
  const text = typeof body === "string" ? body.trim() : "";
  if (text.length > 2000) return { ok: false, error: "Message is too long" };

  let imageUrl: string | null = null;
  if (typeof base64 === "string" && base64) {
    const ext = String(fileExt || "jpg").toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) return { ok: false, error: "Unsupported image type" };
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length > MAX_IMAGE_BYTES) return { ok: false, error: "Image is too large" };

    const fileName = `support/${randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(fileName, buffer, {
      contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
    });
    if (error) return { ok: false, error: error.message };
    imageUrl = supabase.storage.from("avatars").getPublicUrl(fileName).data.publicUrl;
  }

  if (!text && !imageUrl) return { ok: false, error: "Message is empty" };
  return { ok: true, text, imageUrl };
}
