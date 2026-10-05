/*
# Fix reviews -> profiles relationship for PostgREST embedding

## Purpose
`reviews.user_id` only has a foreign key to `auth.users(id)`. The app's
review-fetching query embeds `profiles` via the hint
`profiles!reviews_user_id_fkey`, but that constraint points at
`auth.users`, not `profiles` — PostgREST has no relationship path it can
resolve, so the query fails with PGRST200 for every artwork (even ones
with zero reviews, since the embed clause is validated structurally).
That failure was silently flipping the artwork detail page to
"Piece not found" for every artwork, since the reviews fetch is awaited
alongside the artwork fetch and any rejection was caught as a full
page-load failure.

## Changes
Add a second foreign key on `reviews.user_id` pointing directly at
`profiles(id)` (safe: profiles.id is defined as
`references auth.users(id)`, so it's the same value domain). This gives
PostgREST a real relationship to resolve, named distinctly from the
existing auth.users FK so both can coexist.

No data is modified.
*/

ALTER TABLE reviews
  ADD CONSTRAINT reviews_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
