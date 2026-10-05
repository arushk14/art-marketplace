/*
# Stripe Connect marketplace integration

## 1. artists — Stripe Connect fields
- stripe_account_id (text, nullable) — Stripe connected account ID (acct_...)
- stripe_onboarding_complete (boolean, default false)
- stripe_charges_enabled (boolean, default false)
- stripe_payouts_enabled (boolean, default false)

## 2. artworks — add 'pending' status
- status CHECK constraint expanded: 'available' | 'pending' | 'sold'
- sold_at (timestamptz, nullable) — when payment confirmed

## 3. purchases — Stripe transaction records
- id (uuid, PK)
- artwork_id (uuid, NOT NULL, references artworks ON DELETE RESTRICT)
- buyer_id (uuid, NOT NULL, DEFAULT auth.uid(), references auth.users ON DELETE CASCADE)
- seller_id (uuid, NOT NULL, references artists ON DELETE CASCADE)
- amount_cents (int, NOT NULL) — total paid by buyer in cents
- marketplace_fee_cents (int, NOT NULL) — marketplace commission in cents
- artist_amount_cents (int, NOT NULL) — artist payout in cents
- currency (text, default 'usd')
- status (text, default 'pending') — 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'
- stripe_checkout_session_id (text, nullable) — Stripe Checkout Session ID
- stripe_payment_intent_id (text, nullable) — Stripe Payment Intent ID
- stripe_transfer_id (text, nullable) — Stripe Transfer ID to connected account
- created_at (timestamptz, default now())
- paid_at (timestamptz, nullable)

## 4. stripe_webhook_events — idempotency
- id (uuid, PK)
- stripe_event_id (text, UNIQUE, NOT NULL) — prevents duplicate processing
- event_type (text, NOT NULL)
- processed_at (timestamptz, default now())

## Security
- purchases: buyer can see own purchases; seller can see purchases for their artworks
- All writes happen via edge functions (service role key) or RLS-scoped client inserts
- purchases INSERT: authenticated (buyer_id defaults to auth.uid())
- purchases SELECT: authenticated, buyer or seller only
- stripe_webhook_events: no client access (service role only — no RLS policy = locked)
*/

-- ============================================================
-- 1. ARTISTS — Stripe Connect fields
-- ============================================================

ALTER TABLE artists ADD COLUMN IF NOT EXISTS stripe_account_id text;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS stripe_onboarding_complete boolean NOT NULL DEFAULT false;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean NOT NULL DEFAULT false;

-- ============================================================
-- 2. ARTWORKS — add 'pending' status + sold_at
-- ============================================================

ALTER TABLE artworks ADD COLUMN IF NOT EXISTS sold_at timestamptz;

-- Drop and recreate the status constraint to allow 'pending'
ALTER TABLE artworks DROP CONSTRAINT IF EXISTS artworks_status_check;
ALTER TABLE artworks ADD CONSTRAINT artworks_status_check
  CHECK (status IN ('available', 'pending', 'sold'));

-- ============================================================
-- 3. PURCHASES — Stripe transaction records
-- ============================================================

CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id uuid NOT NULL REFERENCES artworks(id) ON DELETE RESTRICT,
  buyer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  amount_cents int NOT NULL CHECK (amount_cents > 0),
  marketplace_fee_cents int NOT NULL CHECK (marketplace_fee_cents >= 0),
  artist_amount_cents int NOT NULL CHECK (artist_amount_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_transfer_id text,
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_purchases_buyer_id ON purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_seller_id ON purchases(seller_id);
CREATE INDEX IF NOT EXISTS idx_purchases_artwork_id ON purchases(artwork_id);
CREATE INDEX IF NOT EXISTS idx_purchases_stripe_session ON purchases(stripe_checkout_session_id);

-- ============================================================
-- 4. STRIPE_WEBHOOK_EVENTS — idempotency
-- ============================================================

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  processed_at timestamptz DEFAULT now()
);

-- ============================================================
-- 5. RLS — PURCHASES
-- ============================================================

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchase_select_own" ON purchases;
CREATE POLICY "purchase_select_own" ON purchases FOR SELECT
  TO authenticated USING (
    buyer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM artists WHERE artists.id = purchases.seller_id AND artists.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "purchase_insert_own" ON purchases;
CREATE POLICY "purchase_insert_own" ON purchases FOR INSERT
  TO authenticated WITH CHECK (buyer_id = auth.uid());

-- ============================================================
-- 6. RLS — STRIPE_WEBHOOK_EVENTS (no client access)
-- ============================================================

ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies = locked to all roles except service_role (bypasses RLS)
