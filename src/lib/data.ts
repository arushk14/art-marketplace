import { supabase } from '@/lib/supabase';
import type { Artist, ArtCategory, Artwork, ArtworkWithArtist, ArtworkImage, ReviewWithReviewer, Profile, OrderWithItems, WishlistItem, PurchaseWithDetails, StripeConnectStatus } from '@/lib/types';

export async function fetchFeaturedArtists(): Promise<Artist[]> {
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .eq('featured', true)
    .order('created_at');
  if (error) throw error;
  return data as Artist[];
}

export async function fetchAllArtists(): Promise<Artist[]> {
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .order('name');
  if (error) throw error;
  return data as Artist[];
}

export async function fetchArtistBySlug(slug: string): Promise<Artist | null> {
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return (data as Artist) ?? null;
}

export async function fetchArtistByUserId(userId: string): Promise<Artist | null> {
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Artist) ?? null;
}

export interface ArtworkFilters {
  category?: ArtCategory | null;
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'title';
  search?: string;
  offset?: number;
  limit?: number;
}

export interface ArtworkPage {
  items: ArtworkWithArtist[];
  total: number;
  hasMore: boolean;
}

const DEFAULT_PAGE_SIZE = 24;

export async function fetchArtworks(filters: ArtworkFilters = {}): Promise<ArtworkPage> {
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? DEFAULT_PAGE_SIZE;

  let query = supabase
    .from('artworks')
    .select('*, artist:artists(*)', { count: 'exact' })
    .eq('status', 'available');

  if (filters.category) {
    query = query.eq('category', filters.category);
  }
  if (filters.search) {
    query = query.ilike('title', `%${filters.search}%`);
  }

  switch (filters.sort) {
    case 'price-asc':
      query = query.order('price', { ascending: true });
      break;
    case 'price-desc':
      query = query.order('price', { ascending: false });
      break;
    case 'title':
      query = query.order('title', { ascending: true });
      break;
    default:
      query = query.order('created_at', { ascending: false });
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) throw error;
  const total = count ?? 0;
  return {
    items: data as unknown as ArtworkWithArtist[],
    total,
    hasMore: offset + limit < total,
  };
}

export async function fetchCuratedArtworks(limit = 8): Promise<ArtworkWithArtist[]> {
  const { data, error } = await supabase
    .from('artworks')
    .select('*, artist:artists(*)')
    .eq('curated', true)
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as unknown as ArtworkWithArtist[];
}

export async function fetchArtworkBySlug(slug: string): Promise<ArtworkWithArtist | null> {
  const { data, error } = await supabase
    .from('artworks')
    .select('*, artist:artists(*)')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ArtworkWithArtist) ?? null;
}

export async function fetchArtworksByArtist(artistId: string): Promise<Artwork[]> {
  const { data, error } = await supabase
    .from('artworks')
    .select('*')
    .eq('artist_id', artistId)
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Artwork[];
}

export async function fetchRelatedArtworks(
  artwork: Artwork,
  limit = 4,
): Promise<ArtworkWithArtist[]> {
  const { data, error } = await supabase
    .from('artworks')
    .select('*, artist:artists(*)')
    .eq('artist_id', artwork.artist_id)
    .eq('status', 'available')
    .neq('id', artwork.id)
    .order('featured', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as unknown as ArtworkWithArtist[];
}

export async function fetchArtworkImages(artworkId: string): Promise<ArtworkImage[]> {
  const { data, error } = await supabase
    .from('artwork_images')
    .select('*')
    .eq('artwork_id', artworkId)
    .order('position', { ascending: true });
  if (error) throw error;
  return data as ArtworkImage[];
}

export async function fetchReviews(artworkId: string): Promise<ReviewWithReviewer[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, reviewer:profiles!reviews_user_id_profiles_fkey(*)')
    .eq('artwork_id', artworkId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as ReviewWithReviewer[];
}

export async function addReview(artworkId: string, rating: number, comment: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('reviews')
    .insert({ artwork_id: artworkId, rating, comment });
  return { error: error?.message ?? null };
}

export async function deleteReview(reviewId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
  return { error: error?.message ?? null };
}

export async function toggleWishlist(artworkId: string): Promise<{ wishlisted: boolean; error: string | null }> {
  const { data: existing } = await supabase
    .from('wishlist')
    .select('artwork_id')
    .eq('artwork_id', artworkId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('wishlist').delete().eq('artwork_id', artworkId);
    return { wishlisted: false, error: error?.message ?? null };
  }
  const { error } = await supabase.from('wishlist').insert({ artwork_id: artworkId });
  return { wishlisted: true, error: error?.message ?? null };
}

export async function isWishlisted(artworkId: string): Promise<boolean> {
  const { data } = await supabase
    .from('wishlist')
    .select('artwork_id')
    .eq('artwork_id', artworkId)
    .maybeSingle();
  return !!data;
}

export async function fetchWishlist(): Promise<WishlistItem[]> {
  const { data, error } = await supabase
    .from('wishlist')
    .select('artwork_id, user_id, created_at, artwork:artworks(*, artist:artists(*))')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as WishlistItem[];
}

export async function toggleFollow(artistId: string): Promise<{ following: boolean; error: string | null }> {
  // `follows` is publicly readable (follower counts need to be), so the
  // existence check must be scoped to the current user explicitly — without
  // it, this matches ANY user's follow row for this artist, not just ours.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { following: false, error: 'Please sign in.' };

  const { data: existing } = await supabase
    .from('follows')
    .select('artist_id')
    .eq('artist_id', artistId)
    .eq('follower_id', user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('follows').delete().eq('artist_id', artistId).eq('follower_id', user.id);
    return { following: false, error: error?.message ?? null };
  }
  const { error } = await supabase.from('follows').insert({ artist_id: artistId, follower_id: user.id });
  return { following: true, error: error?.message ?? null };
}

export async function isFollowing(artistId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('follows')
    .select('artist_id')
    .eq('artist_id', artistId)
    .eq('follower_id', user.id)
    .maybeSingle();
  return !!data;
}

export async function fetchFollowedArtists(userId: string): Promise<Artist[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('artist:artists(*)')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as Artist[];
}

export async function fetchFollowerCount(artistId: string): Promise<number> {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('artist_id', artistId);
  if (error) return 0;
  return count ?? 0;
}

export async function fetchOrders(): Promise<OrderWithItems[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as unknown as OrderWithItems[];
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

export async function uploadArtworkImage(file: File, userId: string): Promise<{ url: string | null; error: string | null }> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { url: null, error: 'Please upload a JPEG, PNG, WebP, or GIF image.' };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { url: null, error: 'Image is too large. Please upload a file under 8MB.' };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await supabase.storage.from('artworks').upload(fileName, file, { cacheControl: '3600', upsert: false });
  if (upErr) return { url: null, error: upErr.message };

  const { data } = supabase.storage.from('artworks').getPublicUrl(fileName);
  return { url: data.publicUrl, error: null };
}

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export async function createArtwork(
  artistId: string,
  input: {
    title: string;
    description: string;
    price: number;
    medium: string;
    category: ArtCategory;
    year: number;
    width_cm: number;
    height_cm: number;
    image_url: string;
    style: string;
    shipping_info: string;
    featured: boolean;
    curated: boolean;
  },
  additionalImages: string[] = [],
): Promise<{ slug: string | null; error: string | null }> {
  const slug = `${slugify(input.title)}-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await supabase
    .from('artworks')
    .insert({
      artist_id: artistId,
      title: input.title,
      slug,
      description: input.description || null,
      price: input.price,
      medium: input.medium || null,
      category: input.category,
      year: input.year || null,
      width_cm: input.width_cm || null,
      height_cm: input.height_cm || null,
      image_url: input.image_url,
      style: input.style || null,
      shipping_info: input.shipping_info || null,
      featured: input.featured,
      curated: input.curated,
      status: 'available',
    })
    .select('id, slug')
    .single();

  if (error || !data) return { slug: null, error: error?.message ?? 'Failed to create artwork' };

  if (additionalImages.length > 0) {
    const imgs = additionalImages.map((url, i) => ({
      artwork_id: data.id,
      image_url: url,
      position: i,
    }));
    await supabase.from('artwork_images').insert(imgs);
  }

  return { slug: data.slug, error: null };
}

export async function updateArtwork(
  artworkId: string,
  input: Partial<{
    title: string;
    description: string;
    price: number;
    medium: string;
    category: ArtCategory;
    year: number;
    width_cm: number;
    height_cm: number;
    image_url: string;
    style: string;
    shipping_info: string;
    featured: boolean;
    curated: boolean;
    status: string;
  }>,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('artworks').update(input).eq('id', artworkId);
  return { error: error?.message ?? null };
}

export async function deleteArtwork(artworkId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('artworks').delete().eq('id', artworkId);
  return { error: error?.message ?? null };
}

export async function createArtistProfile(
  userId: string,
  input: { name: string; tagline: string; bio: string; location: string; specialties: string[]; portrait_url: string; website: string; instagram: string; twitter: string },
): Promise<{ slug: string | null; error: string | null }> {
  const slug = `${slugify(input.name)}-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await supabase
    .from('artists')
    .insert({
      user_id: userId,
      name: input.name,
      slug,
      tagline: input.tagline || null,
      bio: input.bio || null,
      location: input.location || null,
      specialties: input.specialties,
      portrait_url: input.portrait_url || null,
      website: input.website || null,
      instagram: input.instagram || null,
      twitter: input.twitter || null,
      featured: false,
    })
    .select('slug')
    .single();

  if (error) return { slug: null, error: error.message };

  await supabase.rpc('set_user_role', { target_user_id: userId, new_role: 'artist' });

  return { slug: data.slug, error: null };
}

export async function updateArtistProfile(
  artistId: string,
  input: Partial<{ name: string; tagline: string; bio: string; location: string; specialties: string[]; portrait_url: string; website: string; instagram: string; twitter: string }>,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('artists').update(input).eq('id', artistId);
  return { error: error?.message ?? null };
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

export async function updateProfile(userId: string, input: Partial<{ display_name: string; avatar_url: string }>): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update(input).eq('id', userId);
  return { error: error?.message ?? null };
}

export const CATEGORIES: ArtCategory[] = ['Painting', 'Watercolor', 'Photography', 'Sculpture'];

// ============================================================
// Stripe Connect — edge function calls
// ============================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function callEdgeFunction(name: string, body: Record<string, unknown>): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  try {
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token ?? SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return { data: null, error: (json as { error?: string } | null)?.error ?? 'Request failed' };
    }
    return { data: json as Record<string, unknown>, error: null };
  } catch {
    return { data: null, error: 'Network error. Please check your connection and try again.' };
  }
}

export async function startStripeConnect(): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await callEdgeFunction('stripe-connect', {});
  if (error) return { url: null, error };
  return { url: (data as { url?: string }).url ?? null, error: null };
}

export async function getStripeConnectStatus(): Promise<{ status: StripeConnectStatus | null; error: string | null }> {
  const { data, error } = await callEdgeFunction('stripe-connect-status', {});
  if (error) return { status: null, error };
  return { status: data as unknown as StripeConnectStatus, error: null };
}

export async function startStripeCheckout(artworkId: string): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await callEdgeFunction('stripe-checkout', { artworkId });
  if (error) return { url: null, error };
  return { url: (data as { url?: string }).url ?? null, error: null };
}

// Cart checkout must be called once per artist group — a Stripe Checkout
// Session can only transfer to one connected account, so a cart spanning
// multiple artists is split (client-side, by artist) into one call per group.
export async function startStripeCartCheckout(artworkIds: string[]): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await callEdgeFunction('stripe-cart-checkout', { artworkIds });
  if (error) return { url: null, error };
  return { url: (data as { url?: string }).url ?? null, error: null };
}

export async function fetchPurchase(purchaseId: string): Promise<PurchaseWithDetails | null> {
  const { data, error } = await supabase
    .from('purchases')
    .select('*, artwork:artworks(*), artist:artists(*)')
    .eq('id', purchaseId)
    .maybeSingle();
  if (error) return null;
  return data as unknown as PurchaseWithDetails;
}

export async function fetchPurchasesBySessionId(sessionId: string): Promise<PurchaseWithDetails[]> {
  const { data, error } = await supabase
    .from('purchases')
    .select('*, artwork:artworks(*), artist:artists(*)')
    .eq('stripe_checkout_session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error) return [];
  return data as unknown as PurchaseWithDetails[];
}

export async function fetchBuyerPurchases(): Promise<PurchaseWithDetails[]> {
  const { data, error } = await supabase
    .from('purchases')
    .select('*, artwork:artworks(*), artist:artists(*)')
    .order('created_at', { ascending: false });
  if (error) return [];
  return data as unknown as PurchaseWithDetails[];
}

export async function fetchArtistPurchases(artistId: string): Promise<PurchaseWithDetails[]> {
  const { data, error } = await supabase
    .from('purchases')
    .select('*, artwork:artworks(*), artist:artists(*)')
    .eq('seller_id', artistId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data as unknown as PurchaseWithDetails[];
}
