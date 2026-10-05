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

    const { data: artist } = await supabase
      .from("artists")
      .select("id, stripe_account_id, stripe_onboarding_complete, stripe_charges_enabled, stripe_payouts_enabled")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!artist) {
      return new Response(JSON.stringify({ error: "Artist profile not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!artist.stripe_account_id) {
      return new Response(JSON.stringify({
        connected: false,
        onboarding_complete: false,
        charges_enabled: false,
        payouts_enabled: false,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Retrieve the live status from Stripe
    const account = await stripe.accounts.retrieve(artist.stripe_account_id);

    const chargesEnabled = account.charges_enabled;
    const payoutsEnabled = account.payouts_enabled;
    const onboardingComplete = account.details_submitted;

    // Update the database with the latest status
    await supabase
      .from("artists")
      .update({
        stripe_onboarding_complete: onboardingComplete,
        stripe_charges_enabled: chargesEnabled,
        stripe_payouts_enabled: payoutsEnabled,
      })
      .eq("id", artist.id);

    // If onboarding is incomplete, generate a new account link
    let onboardingUrl: string | null = null;
    if (!onboardingComplete) {
      const origin = req.headers.get("Origin") || "http://localhost:5173";
      const accountLink = await stripe.accountLinks.create({
        account: artist.stripe_account_id,
        refresh_url: `${origin}/#/artist-dashboard`,
        return_url: `${origin}/#/artist-dashboard`,
        type: "account_onboarding",
      });
      onboardingUrl = accountLink.url;
    }

    // Also generate a dashboard link if fully onboarded (for updating info)
    let dashboardUrl: string | null = null;
    if (onboardingComplete) {
      try {
        const loginLink = await stripe.accounts.createLoginLink(artist.stripe_account_id);
        dashboardUrl = loginLink.url;
      } catch {
        // Express accounts may not support login links until fully onboarded
      }
    }

    return new Response(JSON.stringify({
      connected: true,
      onboarding_complete: onboardingComplete,
      charges_enabled: chargesEnabled,
      payouts_enabled: payoutsEnabled,
      onboarding_url: onboardingUrl,
      dashboard_url: dashboardUrl,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("stripe-connect-status failed:", message);
    return new Response(JSON.stringify({ error: `Failed to retrieve Stripe status: ${message}` }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
