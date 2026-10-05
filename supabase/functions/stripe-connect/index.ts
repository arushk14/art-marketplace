import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RequestBody = await req.json().catch(() => ({}));
    const frontendUrl = body.returnUrl || req.headers.get("Origin") || "http://localhost:5173";
    const origin = new URL(frontendUrl).origin;

    // Find the artist profile for this user
    const { data: artist } = await supabase
      .from("artists")
      .select("id, name, stripe_account_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!artist) {
      return new Response(JSON.stringify({ error: "Artist profile not found. Please create your artist profile first." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accountId = artist.stripe_account_id;

    // Create a Connect account if one doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        metadata: {
          artist_id: artist.id,
          user_id: user.id,
        },
      });
      accountId = account.id;

      await supabase
        .from("artists")
        .update({ stripe_account_id: accountId })
        .eq("id", artist.id);
    }

    // Create an account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/#/artist-dashboard`,
      return_url: `${origin}/#/artist-dashboard`,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: accountLink.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("stripe-connect failed:", message);
    return new Response(JSON.stringify({ error: `Failed to start Stripe onboarding: ${message}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
