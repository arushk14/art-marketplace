export type ArtCategory = 'Painting' | 'Watercolor' | 'Photography' | 'Sculpture';

export interface Artist {
  id: string;
  user_id: string | null;
  name: string;
  slug: string;
  tagline: string | null;
  bio: string | null;
  portrait_url: string | null;
  location: string | null;
  specialties: string[];
  featured: boolean;
  website: string | null;
  instagram: string | null;
  twitter: string | null;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  created_at: string;
}

export interface Artwork {
  id: string;
  artist_id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number;
  medium: string | null;
  category: ArtCategory;
  year: number | null;
  width_cm: number | null;
  height_cm: number | null;
  image_url: string;
  featured: boolean;
  curated: boolean;
  status: 'available' | 'pending' | 'sold';
  style: string | null;
  shipping_info: string | null;
  sold_at: string | null;
  created_at: string;
}

export interface ArtworkWithArtist extends Artwork {
  artist: Artist;
}

export interface ArtworkImage {
  id: string;
  artwork_id: string;
  image_url: string;
  position: number;
  created_at: string;
}

export interface Review {
  id: string;
  user_id: string;
  artwork_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer?: Profile;
}

export interface ReviewWithReviewer extends Review {
  reviewer: Profile;
}

export interface Profile {
  id: string;
  role: 'buyer' | 'artist';
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  status: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shipping_name: string | null;
  shipping_email: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_postal: string | null;
  shipping_country: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  artwork_id: string | null;
  title: string;
  artist_name: string;
  price: number;
  image_url: string | null;
  created_at: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface WishlistItem {
  artwork_id: string;
  user_id: string;
  created_at: string;
  artwork: ArtworkWithArtist;
}

export interface Follow {
  follower_id: string;
  artist_id: string;
  created_at: string;
}

export interface CartItem {
  artworkId: string;
  slug: string;
  title: string;
  artistId: string;
  artistName: string;
  artistSlug: string;
  price: number;
  image_url: string;
}

export interface Purchase {
  id: string;
  artwork_id: string;
  buyer_id: string;
  seller_id: string;
  amount_cents: number;
  marketplace_fee_cents: number;
  artist_amount_cents: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface PurchaseWithDetails extends Purchase {
  artwork: Artwork;
  artist: Artist;
}

export interface StripeConnectStatus {
  connected: boolean;
  onboarding_complete: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  onboarding_url: string | null;
  dashboard_url: string | null;
}
