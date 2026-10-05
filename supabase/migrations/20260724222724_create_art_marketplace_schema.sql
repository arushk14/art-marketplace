/*
# Create art marketplace catalog (himabindu.studio)

## Purpose
This migration creates the public, read-only catalog for an online art marketplace:
artists and their artworks. The app has no sign-in screen, so this is a single-tenant
catalog where all data is intentionally public/shared — visitors browse, view artist
portfolios, add works to a cart, and check out. The shopping cart itself lives
client-side (localStorage), so only the catalog needs to persist in the database.

## 1. New Tables

### artists
- `id` (uuid, primary key)
- `name` (text, not null) — display name
- `slug` (text, unique, not null) — URL-safe identifier used in routes (#/artist/:slug)
- `tagline` (text) — short one-line descriptor shown on cards
- `bio` (text) — full artist biography shown on the portfolio page
- `portrait_url` (text) — artist headshot image URL
- `location` (text) — city/country, shown on portfolio
- `specialties` (text[]) — e.g. {'Abstract','Oil'}, shown as tags
- `featured` (boolean, default false) — surfaced on the homepage "Featured Artists" section
- `created_at` (timestamptz, default now())

### artworks
- `id` (uuid, primary key)
- `artist_id` (uuid, not null, references artists ON DELETE CASCADE)
- `title` (text, not null)
- `slug` (text, unique, not null) — URL-safe identifier used in routes (#/artwork/:slug)
- `description` (text) — curator/artist description of the piece
- `price` (numeric(10,2), not null) — sale price in USD
- `medium` (text) — e.g. 'Oil on canvas'
- `category` (text, not null) — 'Painting' | 'Watercolor' | 'Photography' | 'Sculpture'
- `year` (int) — year of creation
- `width_cm` (numeric(6,1)) — physical width
- `height_cm` (numeric(6,1)) — physical height
- `image_url` (text, not null) — primary artwork image
- `featured` (boolean, default false) — marks an artist's "best work"; drives the
  dedicated "Selected Works" section on each artist's portfolio page (the distinct feature)
- `curated` (boolean, default false) — surfaced on the homepage "Curated Collection"
- `status` (text, default 'available') — 'available' | 'sold'
- `created_at` (timestamptz, default now())

## 2. Indexes
- `artworks.artist_id` — portfolio pages query all works by one artist
- `artworks.category` — shop page filters by category
- `artworks.slug` (unique) — route lookups
- `artists.slug` (unique) — route lookups
- `artists.featured` — homepage featured query

## 3. Security (RLS)
- This is a no-auth, single-tenant catalog: all data is intentionally public.
- RLS enabled on both tables.
- SELECT policy `TO anon, authenticated USING (true)` on both tables so the
  anon-key frontend can read the catalog. No INSERT/UPDATE/DELETE policies are
  created because the frontend never mutates the catalog (seeding is done via
  the privileged service role, which bypasses RLS).
*/

CREATE TABLE IF NOT EXISTS artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  tagline text,
  bio text,
  portrait_url text,
  location text,
  specialties text[] DEFAULT '{}',
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS artworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  price numeric(10,2) NOT NULL,
  medium text,
  category text NOT NULL,
  year int,
  width_cm numeric(6,1),
  height_cm numeric(6,1),
  image_url text NOT NULL,
  featured boolean NOT NULL DEFAULT false,
  curated boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'available',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_artworks_artist_id ON artworks(artist_id);
CREATE INDEX IF NOT EXISTS idx_artworks_category ON artworks(category);
CREATE INDEX IF NOT EXISTS idx_artworks_status ON artworks(status);
CREATE INDEX IF NOT EXISTS idx_artists_featured ON artists(featured);

ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE artworks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_artists" ON artists;
CREATE POLICY "anon_read_artists" ON artists FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read_artworks" ON artworks;
CREATE POLICY "anon_read_artworks" ON artworks FOR SELECT
  TO anon, authenticated USING (true);
