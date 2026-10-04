import { getSessionUser } from "@/lib/supabase-server";
import { isPaymentPaid } from "@/lib/bakong";
import { creditRecipePurchase } from "@/lib/recipe-purchase";

export async function POST(request: Request, { id }: Record<string, string>) {
  const session = await getSessionUser(request);
  if (!session) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  const { md5 } = await request.json().catch(() => ({ md5: undefined }));
  if (!md5) {
    return Response.json({ error: "Missing payment reference" }, { status: 400 });
  }

  try {
    const paid = await isPaymentPaid(md5);
    if (!paid) {
      return Response.json({ error: "Payment not received yet" }, { status: 402 });
    }

    await creditRecipePurchase(session.user.id, id);
    return Response.json({ success: true });
  } catch (err) {
    console.error("Unlock failed:", err);
    const message = err instanceof Error ? err.message : "Failed to unlock";
    const status = message === "Recipe not found" ? 404 : 500;
    return Response.json({ error: message }, { status });
  }
}
