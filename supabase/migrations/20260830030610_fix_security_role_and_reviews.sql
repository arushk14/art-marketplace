-- ============================================================
-- P0-1: Lock profiles.role — prevent client-side role changes
-- ============================================================
-- Revoke column-level UPDATE on `role` so users cannot escalate
-- themselves via the profiles table. The role is set during signup
-- via a SECURITY DEFINER function that only runs on INSERT.

-- Revoke UPDATE on the role column from authenticated and anon
REVOKE UPDATE (role) ON profiles FROM authenticated, anon;

-- Grant UPDATE on all columns EXCEPT role (cannot revoke a single
-- column from a grant that covers all columns, so we revoke all
-- then re-grant specific columns)
REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (display_name, avatar_url) ON profiles TO authenticated;

-- ============================================================
-- P0-2: Reviews — verify purchaser before allowing INSERT
-- ============================================================
-- Replace the review INSERT policy with one that checks the user
-- has a paid purchase for the artwork.

DROP POLICY IF EXISTS "review_insert_own" ON reviews;
CREATE POLICY "review_insert_own" ON reviews FOR INSERT
  TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM purchases p
      WHERE p.buyer_id = auth.uid()
        AND p.artwork_id = reviews.artwork_id
        AND p.status = 'paid'
    )
  );

-- ============================================================
-- P0-4: Revoke EXECUTE on handle_new_user() from anon and authenticated
-- ============================================================
-- The function is a trigger function and should only be called by
-- the trigger, not via the REST API.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- ============================================================
-- P0-5: Webhook idempotency — use ON CONFLICT for atomic insert
-- ============================================================
-- Add a unique constraint (already exists) and ensure the column
-- is properly indexed for the upsert pattern.
CREATE UNIQUE INDEX IF NOT EXISTS stripe_webhook_events_stripe_event_id_key
  ON stripe_webhook_events(stripe_event_id);
