import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeSecretKey, { httpClient: Stripe.createFetchHttpClient() });
    const cryptoProvider = Stripe.createSubtleCryptoProvider();

    // Verify the webhook signature
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret, undefined, cryptoProvider);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signature verification failed";
      return new Response(JSON.stringify({ error: `Webhook signature verification failed: ${message}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency — atomically insert the event ID. If a concurrent delivery
    // already inserted it, the ON CONFLICT means no row is created and we
    // can detect the duplicate via the returned data.
    const { data: inserted, error: insertError } = await supabase
      .from("stripe_webhook_events")
      .upsert(
        {
          stripe_event_id: event.id,
          event_type: event.type,
        },
        { onConflict: "stripe_event_id", ignoreDuplicates: true }
      )
      .select("stripe_event_id");

    if (insertError) {
      return new Response(JSON.stringify({ error: "Idempotency check failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If no row was returned, the event was already processed by a concurrent delivery
    if (!inserted || inserted.length === 0) {
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle events.
    //
    // A single Checkout Session (and the PaymentIntent it creates) can now
    // cover MULTIPLE purchase rows — one per artwork — when a buyer checks
    // out several pieces from the same artist's cart in one payment. Every
    // purchase row for a session/payment intent is looked up and updated
    // together rather than assuming exactly one row per event.
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Retrieve every pending purchase tied to this checkout session
        // (works for both the single-item Buy Now flow and multi-item cart
        // checkout — both set stripe_checkout_session_id right after the
        // Stripe session is created, before the buyer can possibly pay).
        const { data: purchases } = await supabase
          .from("purchases")
          .select("id, artwork_id, status")
          .eq("stripe_checkout_session_id", session.id);

        if (!purchases || purchases.length === 0) break;

        const pending = purchases.filter((p) => p.status !== "paid");
        if (pending.length === 0) break; // already processed (idempotency)

        const paymentIntentId = session.payment_intent as string;

        await supabase
          .from("purchases")
          .update({
            status: "paid",
            stripe_payment_intent_id: paymentIntentId,
            paid_at: new Date().toISOString(),
          })
          .in("id", pending.map((p) => p.id));

        // Mark every purchased artwork as sold — webhook is the source of truth
        await supabase
          .from("artworks")
          .update({
            status: "sold",
            sold_at: new Date().toISOString(),
          })
          .in("id", pending.map((p) => p.artwork_id));

        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;

        const { data: purchases } = await supabase
          .from("purchases")
          .select("id, artwork_id, status")
          .eq("stripe_checkout_session_id", session.id);

        if (!purchases || purchases.length === 0) break;

        const stillPending = purchases.filter((p) => p.status === "pending");
        if (stillPending.length === 0) break; // nothing to revert (already paid or resolved)

        await supabase
          .from("purchases")
          .update({ status: "cancelled" })
          .in("id", stillPending.map((p) => p.id));

        // Make the artworks available again
        await supabase
          .from("artworks")
          .update({ status: "available" })
          .in("id", stillPending.map((p) => p.artwork_id))
          .eq("status", "pending"); // Only revert if still pending

        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // A failed payment attempt doesn't necessarily carry our session id
        // directly — look up the Checkout Session(s) associated with this
        // payment intent so a declined card still frees up the artwork.
        const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntent.id, limit: 1 });
        const session = sessions.data[0];
        if (!session) break;

        const { data: purchases } = await supabase
          .from("purchases")
          .select("id, artwork_id, status")
          .eq("stripe_checkout_session_id", session.id);

        if (!purchases || purchases.length === 0) break;

        const stillPending = purchases.filter((p) => p.status === "pending");
        if (stillPending.length === 0) break;

        await supabase
          .from("purchases")
          .update({ status: "failed" })
          .in("id", stillPending.map((p) => p.id));

        await supabase
          .from("artworks")
          .update({ status: "available" })
          .in("id", stillPending.map((p) => p.artwork_id))
          .eq("status", "pending");

        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;

        // Update the artist's Stripe status
        await supabase
          .from("artists")
          .update({
            stripe_onboarding_complete: account.details_submitted,
            stripe_charges_enabled: account.charges_enabled,
            stripe_payouts_enabled: account.payouts_enabled,
          })
          .eq("stripe_account_id", account.id);

        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;

        if (!paymentIntentId) break;

        const { data: purchases } = await supabase
          .from("purchases")
          .select("id, artwork_id, status")
          .eq("stripe_payment_intent_id", paymentIntentId);

        if (!purchases || purchases.length === 0) break;

        await supabase
          .from("purchases")
          .update({ status: "refunded" })
          .in("id", purchases.map((p) => p.id));

        // Make the artworks available again since they were sold
        await supabase
          .from("artworks")
          .update({ status: "available", sold_at: null })
          .in("id", purchases.map((p) => p.artwork_id));

        break;
      }

      default:
        // Unhandled event type — acknowledge receipt
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("stripe-webhook failed:", message);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
