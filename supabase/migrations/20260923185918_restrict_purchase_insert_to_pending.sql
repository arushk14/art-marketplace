/*
# Close purchase-forgery hole: restrict client INSERT to status='pending'

## Purpose
`purchase_insert_own` only checked `buyer_id = auth.uid()`, with no
constraint on `status`. This let any authenticated client INSERT a
purchases row directly via the REST API with status='paid' and an
arbitrary amount — a completely fabricated "paid" purchase with no
Stripe charge behind it, which would then show up as real in the
buyer's dashboard and the artist's sales/revenue numbers.

Confirmed exploitable via direct testing: a real authenticated user
inserted a `status: 'paid'` row for $0.01 with no stripe_payment_intent_id,
bypassing stripe-checkout/stripe-cart-checkout entirely.

## Fix
The legitimate path (both edge functions) always inserts with
status='pending' using the service-role client, which bypasses RLS
entirely — so restricting the client-facing INSERT policy to
status='pending' has no effect on real checkouts, and closes the
forgery path. Only the webhook (service role) can ever move a purchase
to 'paid'/'failed'/'cancelled'/'refunded'.

No data is modified by this migration; it only tightens future inserts.
*/

DROP POLICY IF EXISTS "purchase_insert_own" ON purchases;
CREATE POLICY "purchase_insert_own" ON purchases FOR INSERT
  TO authenticated WITH CHECK (
    buyer_id = auth.uid()
    AND status = 'pending'
  );
