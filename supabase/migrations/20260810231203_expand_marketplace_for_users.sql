/*
# Expand marketplace: user accounts, orders, wishlist, reviews, follows, artist uploads

## Purpose
Transforms the catalog from a read-only single-tenant showcase into a full multi-user
marketplace. Artists sign up, create profiles, upload artworks (with multiple images),
and manage their inventory. Buyers sign up, browse, add to cart, place real orders,
wishlist pieces, follow artists, and leave reviews. All catalog content remains
publicly readable (anon + authenticated) so visitors can browse without signing in;
writes are owner-scoped to authenticated users.

## 1. Modified Tables

### artists (added columns)
- `user_id` (uuid, nullable, references auth.users ON DELETE CASCADE) — links the
  artist profile to the auth user who owns it. Null for legacy/seed rows.
- `website` (text) — personal website URL
- `instagram` (text) — Instagram handle or URL
- `twitter` (text) — Twitter/X handle or URL

### artworks (added columns)
- `style` (text) — e.g. 'Abstract', 'Realism', 'Minimalism'
- `shipping_info` (text) — description of how the artist ships the piece

## 2. New Tables

### profiles
- `id` (uuid, PK, references auth.users ON DELETE CASCADE) — 1:1 with auth user
- `role` (text, default 'buyer') — 'buyer' | 'artist'
- `display_name` (text) — name shown on dashboard and reviews
- `avatar_url` (text) — profile picture
- `created_at` (timestamptz)

### artwork_images
- `id` (uuid, PK)
- `artwork_id` (uuid, NOT NULL, references artworks ON DELETE CASCADE)
- `image_url` (text, NOT NULL)
- `position` (int, default 0) — ordering for gallery display
- `created_at` (timestamptz)

### orders
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), references auth.users ON DELETE CASCADE)
- `status` (text, default 'pending') — 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
- `subtotal` (numeric(10,2), NOT NULL)
- `shipping` (numeric(10,2), default 0)
- `tax` (numeric(10,2), default 0)
- `total` (numeric(10,2), NOT NULL)
- `shipping_name` (text)
- `shipping_email` (text)
- `shipping_address` (text)
- `shipping_city` (text)
- `shipping_postal` (text)
- `shipping_country` (text)
- `created_at` (timestamptz, default now())

### order_items
- `id` (uuid, PK)
- `order_id` (uuid, NOT NULL, references orders ON DELETE CASCADE)
- `artwork_id` (uuid, references artworks ON DELETE SET NULL) — nullable so order
  history survives even if an artwork is later deleted
- `title` (text, NOT NULL) — snapshot of title at purchase time
- `artist_name` (text, NOT NULL) — snapshot of artist name
- `price` (numeric(10,2), NOT NULL) — snapshot of price at purchase time
- `image_url` (text) — snapshot of image URL
- `created_at` (timestamptz, default now())

### wishlist
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), references auth.users ON DELETE CASCADE)
- `artwork_id` (uuid, NOT NULL, references artworks ON DELETE CASCADE)
- `created_at` (timestamptz, default now())
- PRIMARY KEY (user_id, artwork_id) — one wishlist entry per artwork per user

### follows
- `follower_id` (uuid, NOT NULL, DEFAULT auth.uid(), references auth.users ON DELETE CASCADE)
- `artist_id` (uuid, NOT NULL, references artists ON DELETE CASCADE)
- `created_at` (timestamptz, default now())
- PRIMARY KEY (follower_id, artist_id) — one follow per artist per user

### reviews
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), references auth.users ON DELETE CASCADE)
- `artwork_id` (uuid, NOT NULL, references artworks ON DELETE CASCADE)
- `rating` (int, NOT NULL, CHECK 1–5)
- `comment` (text)
- `created_at` (timestamptz, default now())
- UNIQUE (user_id, artwork_id) — one review per artwork per user

## 3. Storage
- Creates a public bucket `artworks` for artist image uploads.
- Public read; authenticated users can write/update/delete only within their own
  folder (path prefixed with their auth uid).

## 4. Security (RLS)

### Public-readable catalog (no change to existing SELECT policies)
- artists SELECT: anon + authenticated (unchanged)
- artworks SELECT: anon + authenticated (unchanged)

### Artist write access (new)
- artists INSERT/UPDATE/DELETE: authenticated where user_id = auth.uid()
- artworks INSERT/UPDATE/DELETE: authenticated where the artwork's artist.user_id = auth.uid()

### profiles
- SELECT: public (anon + authenticated) — so anyone can see display names, avatars
- INSERT/UPDATE: authenticated, own row only (id = auth.uid())

### artwork_images
- SELECT: public
- INSERT/UPDATE/DELETE: authenticated, only if the parent artwork's artist.user_id = auth.uid()

### orders
- SELECT: authenticated, own orders only (user_id = auth.uid())
- INSERT: authenticated (user_id defaults to auth.uid())

### order_items
- SELECT: authenticated, only if the parent order's user_id = auth.uid()

### wishlist
- SELECT/INSERT/DELETE: authenticated, own rows only (user_id = auth.uid())

### follows
- SELECT: public (anyone can see who follows whom)
- INSERT/DELETE: authenticated, own rows only (follower_id = auth.uid())

### reviews
- SELECT: public
- INSERT: authenticated (user_id defaults to auth.uid())
- UPDATE/DELETE: authenticated, own reviews only (user_id = auth.uid())

## 5. Indexes
- artwork_images by artwork_id
- orders by user_id
- order_items by order_id
- wishlist by user_id
- follows by artist_id (for follower counts)
- reviews by artwork_id
- artists by user_id (for dashboard lookup)
*/

-- ============================================================
-- 1. MODIFY EXISTING TABLES (add columns only — no destructive changes)
-- ============================================================

ALTER TABLE artists ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS twitter text;

ALTER TABLE artworks ADD COLUMN IF NOT EXISTS style text;
ALTER TABLE artworks ADD COLUMN IF NOT EXISTS shipping_info text;

CREATE INDEX IF NOT EXISTS idx_artists_user_id ON artists(user_id);

-- ============================================================
-- 2. NEW TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'buyer',
  display_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS artwork_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id uuid NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'paid',
  subtotal numeric(10,2) NOT NULL,
  shipping numeric(10,2) NOT NULL DEFAULT 0,
  tax numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL,
  shipping_name text,
  shipping_email text,
  shipping_address text,
  shipping_city text,
  shipping_postal text,
  shipping_country text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  artwork_id uuid REFERENCES artworks(id) ON DELETE SET NULL,
  title text NOT NULL,
  artist_name text NOT NULL,
  price numeric(10,2) NOT NULL,
  image_url text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wishlist (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  artwork_id uuid NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, artwork_id)
);

CREATE TABLE IF NOT EXISTS follows (
  follower_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, artist_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  artwork_id uuid NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, artwork_id)
);

-- ============================================================
-- 3. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_artwork_images_artwork_id ON artwork_images(artwork_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_artist_id ON follows(artist_id);
CREATE INDEX IF NOT EXISTS idx_reviews_artwork_id ON reviews(artwork_id);

-- ============================================================
-- 4. STORAGE BUCKET
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('artworks', 'artworks', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Public read artwork images" ON storage.objects;
CREATE POLICY "Public read artwork images" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'artworks');

DROP POLICY IF EXISTS "Artists upload own images" ON storage.objects;
CREATE POLICY "Artists upload own images" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'artworks'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Artists update own images" ON storage.objects;
CREATE POLICY "Artists update own images" ON storage.objects FOR UPDATE
  TO authenticated USING (
    bucket_id = 'artworks'
    AND (storage.foldername(name))[1] = auth.uid()::text
  ) WITH CHECK (
    bucket_id = 'artworks'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Artists delete own images" ON storage.objects;
CREATE POLICY "Artists delete own images" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'artworks'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- 5. RLS — ENABLE ON ALL NEW TABLES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE artwork_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. RLS POLICIES — ARTISTS (add write policies for owners)
-- ============================================================

DROP POLICY IF EXISTS "artist_insert_own" ON artists;
CREATE POLICY "artist_insert_own" ON artists FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "artist_update_own" ON artists;
CREATE POLICY "artist_update_own" ON artists FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "artist_delete_own" ON artists;
CREATE POLICY "artist_delete_own" ON artists FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- 7. RLS POLICIES — ARTWORKS (add write policies for artist owners)
-- ============================================================

DROP POLICY IF EXISTS "artwork_insert_own" ON artworks;
CREATE POLICY "artwork_insert_own" ON artworks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM artists WHERE artists.id = artworks.artist_id AND artists.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "artwork_update_own" ON artworks;
CREATE POLICY "artwork_update_own" ON artworks FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM artists WHERE artists.id = artworks.artist_id AND artists.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM artists WHERE artists.id = artworks.artist_id AND artists.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "artwork_delete_own" ON artworks;
CREATE POLICY "artwork_delete_own" ON artworks FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM artists WHERE artists.id = artworks.artist_id AND artists.user_id = auth.uid())
  );

-- ============================================================
-- 8. RLS POLICIES — PROFILES
-- ============================================================

DROP POLICY IF EXISTS "profiles_select_public" ON profiles;
CREATE POLICY "profiles_select_public" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "profile_insert_own" ON profiles;
CREATE POLICY "profile_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profile_update_own" ON profiles;
CREATE POLICY "profile_update_own" ON profiles FOR UPDATE
  TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ============================================================
-- 9. RLS POLICIES — ARTWORK_IMAGES
-- ============================================================

DROP POLICY IF EXISTS "artwork_images_select_public" ON artwork_images;
CREATE POLICY "artwork_images_select_public" ON artwork_images FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "artwork_images_insert_own" ON artwork_images;
CREATE POLICY "artwork_images_insert_own" ON artwork_images FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM artists a
      JOIN artworks w ON w.artist_id = a.id
      WHERE w.id = artwork_images.artwork_id AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "artwork_images_update_own" ON artwork_images;
CREATE POLICY "artwork_images_update_own" ON artwork_images FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM artists a
      JOIN artworks w ON w.artist_id = a.id
      WHERE w.id = artwork_images.artwork_id AND a.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM artists a
      JOIN artworks w ON w.artist_id = a.id
      WHERE w.id = artwork_images.artwork_id AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "artwork_images_delete_own" ON artwork_images;
CREATE POLICY "artwork_images_delete_own" ON artwork_images FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM artists a
      JOIN artworks w ON w.artist_id = a.id
      WHERE w.id = artwork_images.artwork_id AND a.user_id = auth.uid()
    )
  );

-- ============================================================
-- 10. RLS POLICIES — ORDERS
-- ============================================================

DROP POLICY IF EXISTS "order_select_own" ON orders;
CREATE POLICY "order_select_own" ON orders FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "order_insert_own" ON orders;
CREATE POLICY "order_insert_own" ON orders FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 11. RLS POLICIES — ORDER_ITEMS
-- ============================================================

DROP POLICY IF EXISTS "order_items_select_own" ON order_items;
CREATE POLICY "order_items_select_own" ON order_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "order_items_insert_own" ON order_items;
CREATE POLICY "order_items_insert_own" ON order_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );

-- ============================================================
-- 12. RLS POLICIES — WISHLIST
-- ============================================================

DROP POLICY IF EXISTS "wishlist_select_own" ON wishlist;
CREATE POLICY "wishlist_select_own" ON wishlist FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "wishlist_insert_own" ON wishlist;
CREATE POLICY "wishlist_insert_own" ON wishlist FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "wishlist_delete_own" ON wishlist;
CREATE POLICY "wishlist_delete_own" ON wishlist FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- 13. RLS POLICIES — FOLLOWS
-- ============================================================

DROP POLICY IF EXISTS "follows_select_public" ON follows;
CREATE POLICY "follows_select_public" ON follows FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "follow_insert_own" ON follows;
CREATE POLICY "follow_insert_own" ON follows FOR INSERT
  TO authenticated WITH CHECK (follower_id = auth.uid());

DROP POLICY IF EXISTS "follow_delete_own" ON follows;
CREATE POLICY "follow_delete_own" ON follows FOR DELETE
  TO authenticated USING (follower_id = auth.uid());

-- ============================================================
-- 14. RLS POLICIES — REVIEWS
-- ============================================================

DROP POLICY IF EXISTS "reviews_select_public" ON reviews;
CREATE POLICY "reviews_select_public" ON reviews FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "review_insert_own" ON reviews;
CREATE POLICY "review_insert_own" ON reviews FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "review_update_own" ON reviews;
CREATE POLICY "review_update_own" ON reviews FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "review_delete_own" ON reviews;
CREATE POLICY "review_delete_own" ON reviews FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- 15. TRIGGER — auto-create profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
