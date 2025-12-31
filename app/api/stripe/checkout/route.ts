import { NextResponse } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  userId: z.string().min(1), // later this should come from Supabase auth session, not client input
  priceId: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { userId, priceId } = parsed.data;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    success_url: `${process.env.APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL}/billing/cancel`,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: userId, // we’ll use this in webhook to map back to user
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
