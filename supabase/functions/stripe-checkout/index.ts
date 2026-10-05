import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Marketplace commission — 10%. Change this value to adjust the platform fee.
const MARKETPLACE_COMMISSION_PERCENT = 10;

interface RequestBody {
  artworkId: string;
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

    const body: RequestBody = await req.json().catch(() => ({}));

    if (!body.artworkId) {
      return new Response(JSON.stringify({ error: "Artwork ID is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Retrieve the artwork from the database (server-side, never trust client price)
    const { data: artwork } = await supabase
      .from("artworks")
      .select("id, title, price, status, image_url, artist_id")
      .eq("id", body.artworkId)
      .maybeSingle();

    if (!artwork) {
      return new Response(JSON.stringify({ error: "Artwork not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Verify the artwork is available
    if (artwork.status !== "available") {
      return new Response(JSON.stringify({ error: "This artwork is no longer available for purchase." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Retrieve the artist/seller
    const { data: artist } = await supabase
      .from("artists")
      .select("id, name, user_id, stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled")
      .eq("id", artwork.artist_id)
      .maybeSingle();

    if (!artist) {
      return new Response(JSON.stringify({ error: "Artist information not found." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Verify the seller has a valid Stripe Connect account
    if (!artist.stripe_account_id || !artist.stripe_charges_enabled) {
      return new Response(JSON.stringify({ error: "The artist has not set up payment processing yet. Please check back later." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Prevent buying your own artwork
    if (artist.user_id === user.id) {
      return new Response(JSON.stringify({ error: "You cannot purchase your own artwork." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Calculate amounts in integer cents (never float)
    const priceCents = Math.round(Number(artwork.price) * 100);
    if (priceCents <= 0) {
      return new Response(JSON.stringify({ error: "Invalid artwork price." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const marketplaceFeeCents = Math.round(priceCents * MARKETPLACE_COMMISSION_PERCENT / 100);
    const artistAmountCents = priceCents - marketplaceFeeCents;

    // 7. Mark artwork as 'pending' to prevent double-purchase (race condition guard).
    // Check the UPDATE's own returned rows, not a separate re-read — a re-read
    // can't distinguish "I just locked it" from "someone else already had it
    // locked", since both cases leave the row at status='pending' either way.
    const { data: lockedRows, error: lockError } = await supabase
      .from("artworks")
      .update({ status: "pending" })
      .eq("id", artwork.id)
      .eq("status", "available") // Only update if still available (optimistic concurrency)
      .select("id");

    if (lockError) {
      return new Response(JSON.stringify({ error: "Unable to proceed with purchase. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!lockedRows || lockedRows.length === 0) {
      return new Response(JSON.stringify({ error: "This artwork was just purchased by someone else." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 8. Create a purchase record
    const { data: purchase, error: purchaseError } = await supabase
      .from("purchases")
      .insert({
        artwork_id: artwork.id,
        buyer_id: user.id,
        seller_id: artist.id,
        amount_cents: priceCents,
        marketplace_fee_cents: marketplaceFeeCents,
        artist_amount_cents: artistAmountCents,
        currency: "usd",
        status: "pending",
      })
      .select("id")
      .single();

    if (purchaseError || !purchase) {
      // Revert artwork to available since we couldn't create the purchase
      await supabase.from("artworks").update({ status: "available" }).eq("id", artwork.id);
      return new Response(JSON.stringify({ error: "Failed to create purchase record." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 9. Determine redirect URLs
    const frontendUrl = body.returnUrl || req.headers.get("Origin") || "http://localhost:5173";
    const origin = new URL(frontendUrl).origin;
    const successUrl = `${origin}/#/payment-success?purchase=${purchase.id}`;
    const cancelUrl = `${origin}/#/payment-cancelled?artwork=${artwork.id}`;

    // 10. Create the Stripe Checkout Session with Connect
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
          application_fee_amount: marketplaceFeeCents,
          transfer_data: {
            destination: artist.stripe_account_id,
          },
        },
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: artwork.title,
              description: `Original artwork by ${artist.name}`,
              images: artwork.image_url ? [artwork.image_url] : [],
            },
            unit_amount: priceCents,
          },
          quantity: 1,
        }],
        shipping_address_collection: { allowed_countries: ["US", "CA", "GB", "AU", "DE", "FR", "IT", "ES", "NL", "IE", "NZ"] },
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: purchase.id,
        metadata: {
          purchase_id: purchase.id,
          artwork_id: artwork.id,
          artist_id: artist.id,
          buyer_id: user.id,
        },
      });
    } catch (err) {
      // Stripe failed to create the session — release the lock we took on
      // the artwork and the purchase record instead of leaving both stuck.
      await supabase.from("artworks").update({ status: "available" }).eq("id", artwork.id).eq("status", "pending");
      await supabase.from("purchases").update({ status: "cancelled" }).eq("id", purchase.id);
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("stripe-checkout session creation failed:", message);
      return new Response(JSON.stringify({ error: `Failed to start checkout: ${message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 11. Store the checkout session ID on the purchase
    await supabase
      .from("purchases")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", purchase.id);

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("stripe-checkout failed:", message);
    return new Response(JSON.stringify({ error: `Failed to start checkout: ${message}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
