import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Marketplace commission — 10%. Keep in sync with stripe-checkout.
const MARKETPLACE_COMMISSION_PERCENT = 10;

interface RequestBody {
  // All artworkIds in a single call must belong to the same artist — a Stripe
  // Checkout Session can only transfer funds to one Connect destination, so a
  // cart spanning multiple artists is checked out as one session per artist
  // (the client groups the cart and calls this function once per group).
  artworkIds: string[];
  returnUrl?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, { httpClient: Stripe.createFetchHttpClient() });

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Please sign in to purchase." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RequestBody = await req.json().catch(() => ({} as RequestBody));
    const artworkIds = Array.isArray(body.artworkIds) ? [...new Set(body.artworkIds)] : [];

    if (artworkIds.length === 0) {
      return new Response(JSON.stringify({ error: "No items to check out." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Retrieve all artworks from the database (server-side, never trust client price)
    const { data: artworks } = await supabase
      .from("artworks")
      .select("id, title, price, status, image_url, artist_id")
      .in("id", artworkIds);

    if (!artworks || artworks.length !== artworkIds.length) {
      return new Response(JSON.stringify({ error: "One or more items could not be found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. All items must belong to the same artist (one Connect destination per session)
    const artistIds = new Set(artworks.map((a) => a.artist_id));
    if (artistIds.size > 1) {
      return new Response(JSON.stringify({ error: "Items from different artists must be checked out separately." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Verify every item is available
    if (artworks.some((a) => a.status !== "available")) {
      return new Response(JSON.stringify({ error: "One or more items are no longer available for purchase." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Retrieve the artist/seller
    const artistId = artworks[0].artist_id;
    const { data: artist } = await supabase
      .from("artists")
      .select("id, name, user_id, stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled")
      .eq("id", artistId)
      .maybeSingle();

    if (!artist) {
      return new Response(JSON.stringify({ error: "Artist information not found." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!artist.stripe_account_id || !artist.stripe_charges_enabled) {
      return new Response(JSON.stringify({ error: `${artist.name} has not set up payment processing yet. Please check back later.` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (artist.user_id === user.id) {
      return new Response(JSON.stringify({ error: "You cannot purchase your own artwork." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Calculate amounts in integer cents (never float) — per item, then summed
    const items = artworks.map((a) => {
      const priceCents = Math.round(Number(a.price) * 100);
      const feeCents = Math.round(priceCents * MARKETPLACE_COMMISSION_PERCENT / 100);
      return { ...a, priceCents, feeCents, artistAmountCents: priceCents - feeCents };
    });

    if (items.some((i) => i.priceCents <= 0)) {
      return new Response(JSON.stringify({ error: "Invalid artwork price." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalFeeCents = items.reduce((sum, i) => sum + i.feeCents, 0);

    // 6. Lock every artwork to prevent double-purchase (race condition guard).
    // Only rows still 'available' get flipped — if fewer rows were affected
    // than requested, someone else grabbed at least one item first.
    const { data: lockedRows, error: lockError } = await supabase
      .from("artworks")
      .update({ status: "pending" })
      .in("id", artworkIds)
      .eq("status", "available")
      .select("id");

    if (lockError) {
      return new Response(JSON.stringify({ error: "Unable to proceed with purchase. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!lockedRows || lockedRows.length !== artworkIds.length) {
      // Revert whatever we did manage to lock — an all-or-nothing checkout.
      const lockedIds = (lockedRows ?? []).map((r) => r.id);
      if (lockedIds.length > 0) {
        await supabase.from("artworks").update({ status: "available" }).in("id", lockedIds);
      }
      return new Response(JSON.stringify({ error: "One or more items were just purchased by someone else." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. Create a purchase record per artwork (all sharing one checkout session once created)
    const { data: purchases, error: purchaseError } = await supabase
      .from("purchases")
      .insert(
        items.map((i) => ({
          artwork_id: i.id,
          buyer_id: user.id,
          seller_id: artist.id,
          amount_cents: i.priceCents,
          marketplace_fee_cents: i.feeCents,
          artist_amount_cents: i.artistAmountCents,
          currency: "usd",
          status: "pending",
        })),
      )
      .select("id, artwork_id");

    if (purchaseError || !purchases || purchases.length !== items.length) {
      await supabase.from("artworks").update({ status: "available" }).in("id", artworkIds);
      return new Response(JSON.stringify({ error: "Failed to create purchase records." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 8. Determine redirect URLs
    const frontendUrl = body.returnUrl || req.headers.get("Origin") || "http://localhost:5173";
    const origin = new URL(frontendUrl).origin;
    const successUrl = `${origin}/#/payment-success?session={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/#/payment-cancelled?artwork=${artworkIds[0]}`;

    // 9. Create the Stripe Checkout Session with Connect — one line item per artwork,
    // all funds transferred to the single artist's connected account.
    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        // This platform account has Stripe's newer Managed Payments enabled
        // by default, which is incompatible with the classic Connect
        // destination-charge pattern (application_fee_amount + transfer_data)
        // used below — disable it for this request so Connect works.
        managed_payments: { enabled: false },
        payment_intent_data: {
          application_fee_amount: totalFeeCents,
          transfer_data: {
            destination: artist.stripe_account_id,
          },
        },
        line_items: items.map((i) => ({
          price_data: {
            currency: "usd",
            product_data: {
              name: i.title,
              description: `Original artwork by ${artist.name}`,
              images: i.image_url ? [i.image_url] : [],
            },
            unit_amount: i.priceCents,
          },
          quantity: 1,
        })),
        shipping_address_collection: { allowed_countries: ["US", "CA", "GB", "AU", "DE", "FR", "IT", "ES", "NL", "IE", "NZ"] },
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          purchase_ids: purchases.map((p) => p.id).join(","),
          artist_id: artist.id,
          buyer_id: user.id,
        },
      });
    } catch (err) {
      // Stripe failed to create the session — release the lock on every
      // artwork in this group and the purchase records instead of leaving
      // them stuck at 'pending' with no session to ever resolve them.
      await supabase.from("artworks").update({ status: "available" }).in("id", artworkIds).eq("status", "pending");
      await supabase.from("purchases").update({ status: "cancelled" }).in("id", purchases.map((p) => p.id));
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("stripe-cart-checkout session creation failed:", message);
      return new Response(JSON.stringify({ error: `Failed to start checkout: ${message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 10. Store the checkout session ID on every purchase row — the webhook
    // uses this column (not client_reference_id) to find and update them.
    await supabase
      .from("purchases")
      .update({ stripe_checkout_session_id: session.id })
      .in("id", purchases.map((p) => p.id));

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("stripe-cart-checkout failed:", message);
    return new Response(JSON.stringify({ error: `Failed to start checkout: ${message}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
