import { useEffect, useState } from 'react';
import { Link, navigate } from '@/lib/router';
import { ArtworkCard } from '@/components/ArtworkCard';
import {
  fetchArtworkBySlug,
  fetchRelatedArtworks,
  fetchArtworkImages,
  fetchReviews,
  toggleWishlist,
  isWishlisted,
  addReview,
} from '@/lib/data';
import { formatPrice, formatDimensions } from '@/lib/format';
import { cartStore, useCart } from '@/lib/cart';
import { useAuth } from '@/lib/auth';
import { startStripeCheckout } from '@/lib/data';
import { clearCheckoutQueue } from '@/lib/checkoutQueue';
import type { ArtworkWithArtist, ArtworkImage, ReviewWithReviewer } from '@/lib/types';
import { ArrowLeft, Check, ShoppingBag, Truck, ShieldCheck, Palette, Heart, Star, X, ZoomIn, CreditCard, Loader2 } from 'lucide-react';

interface ArtworkDetailPageProps {
  slug: string;
  onOpenCart: () => void;
}

export function ArtworkDetailPage({ slug, onOpenCart }: ArtworkDetailPageProps) {
  const { user } = useAuth();
  const [artwork, setArtwork] = useState<ArtworkWithArtist | null>(null);
  const [images, setImages] = useState<ArtworkImage[]>([]);
  const [related, setRelated] = useState<ArtworkWithArtist[]>([]);
  const [reviews, setReviews] = useState<ReviewWithReviewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [added, setAdded] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [wishlisted, setWishlisted] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  const cartItems = useCart();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    setAdded(false);
    setActiveImage(0);
    fetchArtworkBySlug(slug)
      .then((data) => {
        if (!active) return;
        setArtwork(data);
        setLoading(false);
        if (data) {
          // Secondary data (images/related works/reviews) is non-critical —
          // a failure here must never knock out a page that already found
          // its artwork, so it's isolated from the primary catch below.
          Promise.all([
            fetchArtworkImages(data.id),
            fetchRelatedArtworks(data, 4),
            fetchReviews(data.id),
          ])
            .then(([imgs, rel, revs]) => {
              if (!active) return;
              setImages(imgs);
              setRelated(rel);
              setReviews(revs);
            })
            .catch((err) => console.error('Failed to load artwork extras', err));

          if (user) {
            isWishlisted(data.id)
              .then((w) => { if (active) setWishlisted(w); })
              .catch(() => {});
          }
        }
      })
      .catch(() => {
        if (active) { setError(true); setLoading(false); }
      });
    return () => { active = false; };
  }, [slug, user]);

  useEffect(() => {
    if (artwork) {
      setAdded(cartItems.some((i) => i.artworkId === artwork.id));
    }
  }, [cartItems, artwork]);

  if (loading) {
    return (
      <div className="container-content py-12 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="shimmer aspect-[4/5] w-full rounded-2xl" />
          <div className="space-y-6 pt-4">
            <div className="shimmer h-4 w-32 rounded" />
            <div className="shimmer h-12 w-3/4 rounded" />
            <div className="shimmer h-4 w-1/2 rounded" />
            <div className="shimmer h-32 w-full rounded" />
            <div className="shimmer h-12 w-48 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !artwork) {
    return (
      <div className="container-content flex flex-col items-center justify-center gap-5 py-32 text-center">
        <p className="font-serif text-3xl text-ink">Piece not found</p>
        <p className="font-sans text-sm text-ink-muted">
          The artwork you're looking for may have been moved or sold.
        </p>
        <Link to="/shop" className="btn-outline">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Back to the collection
        </Link>
      </div>
    );
  }

  const sold = artwork.status === 'sold';
  const pending = artwork.status === 'pending';
  const unavailable = sold || pending;
  const inCart = added;
  const dims = formatDimensions(artwork.width_cm, artwork.height_cm);
  const allImages = [artwork.image_url, ...images.map((img) => img.image_url)];
  const currentImage = allImages[activeImage] ?? artwork.image_url;
  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  const handleAdd = () => {
    if (unavailable || inCart) return;
    cartStore.add({
      artworkId: artwork.id,
      slug: artwork.slug,
      title: artwork.title,
      artistId: artwork.artist_id,
      artistName: artwork.artist.name,
      artistSlug: artwork.artist.slug,
      price: Number(artwork.price),
      image_url: artwork.image_url,
    });
    setAdded(true);
    onOpenCart();
  };

  const handleBuyNow = async () => {
    if (unavailable || !user) {
      if (!user) { navigate('/login'); return; }
      return;
    }
    setBuying(true);
    setBuyError(null);
    clearCheckoutQueue();
    const { url, error } = await startStripeCheckout(artwork.id);
    if (error) {
      setBuyError(error);
      setBuying(false);
      return;
    }
    if (url) {
      window.location.href = url;
    } else {
      setBuyError('Something went wrong. Please try again.');
      setBuying(false);
    }
  };

  const handleWishlist = async () => {
    if (!user) { navigate('/login'); return; }
    const { wishlisted: w, error } = await toggleWishlist(artwork.id);
    if (error) return;
    setWishlisted(w);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    setReviewSubmitting(true);
    setReviewError(null);
    const { error } = await addReview(artwork.id, reviewRating, reviewComment);
    if (error) {
      setReviewError(error);
      setReviewSubmitting(false);
      return;
    }
    setReviewComment('');
    const revs = await fetchReviews(artwork.id);
    setReviews(revs);
    setReviewSubmitting(false);
  };

  return (
    <div className="container-content py-10 lg:py-14">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 font-sans text-xs text-ink-faint">
        <Link to="/shop" className="transition-colors hover:text-ink">Shop</Link>
        <span>/</span>
        <span className="text-ink-muted">{artwork.category}</span>
        <span>/</span>
        <span className="text-ink">{artwork.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Images */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div
            className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-paper-deep shadow-sm animate-scale-in cursor-zoom-in"
            onClick={() => setZoomOpen(true)}
          >
            <img src={currentImage} alt={artwork.title} className="h-full w-full object-cover" />
            <div className="absolute right-3 top-3 rounded-full bg-ink/40 p-2 text-white opacity-0 transition-opacity hover:opacity-100">
              <ZoomIn className="h-4 w-4" strokeWidth={1.5} />
            </div>
            {unavailable && (
              <div className="absolute inset-0 flex items-center justify-center bg-ink/55 backdrop-blur-[2px]">
                <span className="label-eyebrow rounded-full bg-paper px-6 py-2.5 text-ink">{sold ? 'Sold' : 'Sale pending'}</span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {allImages.length > 1 && (
            <div className="mt-4 flex gap-3">
              {allImages.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`relative h-20 w-16 overflow-hidden rounded-lg border-2 transition-all ${
                    activeImage === idx ? 'border-clay-500' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt={`View ${idx + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="animate-fade-up">
          <div className="flex items-start justify-between gap-4">
            <Link to={`/artist/${artwork.artist.slug}`} className="label-eyebrow transition-colors hover:text-clay-500">
              {artwork.artist.name}
            </Link>
            <button
              onClick={handleWishlist}
              className={`rounded-full p-2.5 transition-colors ${
                wishlisted ? 'text-clay-500' : 'text-ink-faint hover:text-ink hover:bg-paper-deep'
              }`}
              aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart className="h-5 w-5" strokeWidth={1.5} fill={wishlisted ? 'currentColor' : 'none'} />
            </button>
          </div>

          <h1 className="mt-3 font-serif text-4xl font-light leading-tight tracking-tightish text-ink lg:text-5xl">
            {artwork.title}
          </h1>

          <div className="mt-4 flex items-center gap-3">
            <p className="font-serif text-3xl font-light text-ink">{formatPrice(Number(artwork.price))}</p>
            {reviews.length > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-paper-deep px-3 py-1 font-sans text-xs text-ink-muted">
                <Star className="h-3.5 w-3.5 fill-clay-400 text-clay-400" strokeWidth={0} />
                {avgRating.toFixed(1)} ({reviews.length})
              </span>
            )}
          </div>

          {artwork.description && (
            <p className="mt-6 font-sans text-base leading-relaxed text-ink-soft text-pretty">{artwork.description}</p>
          )}

          {/* Specs */}
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-paper-line pt-8">
            <Spec label="Medium" value={artwork.medium} />
            <Spec label="Category" value={artwork.category} />
            <Spec label="Year" value={artwork.year?.toString()} />
            <Spec label="Dimensions" value={dims} />
            <Spec label="Style" value={artwork.style} />
            <Spec label="Availability" value={sold ? 'Sold' : pending ? 'Sale pending' : 'Available'} />
          </dl>

          {artwork.shipping_info && (
            <div className="mt-6 flex items-start gap-3 rounded-xl bg-paper-warm p-4">
              <Truck className="mt-0.5 h-5 w-5 shrink-0 text-clay-500" strokeWidth={1.5} />
              <p className="font-sans text-sm leading-relaxed text-ink-soft">{artwork.shipping_info}</p>
            </div>
          )}

          {/* Action */}
          <div className="mt-8 space-y-3">
            {unavailable ? (
              <button disabled className="btn-outline w-full cursor-not-allowed opacity-60">
                {sold ? 'This piece has been sold' : 'Sale pending — check back soon'}
              </button>
            ) : (
              <>
                <button onClick={handleBuyNow} disabled={buying} className="btn-accent w-full">
                  {buying ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
                      Preparing checkout…
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5" strokeWidth={1.5} />
                      Buy Now · {formatPrice(Number(artwork.price))}
                    </>
                  )}
                </button>
                {inCart ? (
                  <button onClick={onOpenCart} className="btn-outline w-full border-sage-200 text-sage-600 hover:border-sage-400 hover:bg-sage-50">
                    <Check className="h-5 w-5" strokeWidth={1.5} />
                    Added to cart — view cart
                  </button>
                ) : (
                  <button onClick={handleAdd} className="btn-outline w-full">
                    <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
                    Add to Cart
                  </button>
                )}
                {buyError && (
                  <p className="rounded-lg bg-clay-50 px-4 py-3 font-sans text-sm text-clay-600">{buyError}</p>
                )}
              </>
            )}
          </div>

          {/* Trust badges */}
          <div className="mt-8 grid gap-4 border-t border-paper-line pt-8 sm:grid-cols-3">
            <Trust icon={<Truck className="h-5 w-5" strokeWidth={1.5} />} label="Insured shipping from the artist's studio" />
            <Trust icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.5} />} label="14-day satisfaction guarantee" />
            <Trust icon={<Palette className="h-5 w-5" strokeWidth={1.5} />} label="An original, one-of-a-kind work" />
          </div>

          {/* Artist mini-card */}
          <Link
            to={`/artist/${artwork.artist.slug}`}
            className="mt-8 flex items-center gap-4 rounded-2xl border border-paper-line bg-white p-4 transition-all hover:border-ink/20 hover:shadow-sm"
          >
            {artwork.artist.portrait_url && (
              <img src={artwork.artist.portrait_url} alt={artwork.artist.name} className="h-14 w-14 rounded-full object-cover" />
            )}
            <div className="flex-1">
              <p className="font-sans text-xs uppercase tracking-wider2 text-ink-faint">View artist portfolio</p>
              <p className="mt-0.5 font-serif text-lg text-ink">{artwork.artist.name}</p>
              <p className="font-sans text-sm text-ink-muted">{artwork.artist.tagline}</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-20">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-3xl font-light tracking-tightish text-ink">Reviews</h2>
          {reviews.length > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-paper-deep px-3 py-1 font-sans text-sm text-ink-muted">
              <Star className="h-4 w-4 fill-clay-400 text-clay-400" strokeWidth={0} />
              {avgRating.toFixed(1)} · {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
            </span>
          )}
        </div>

        {/* Review form */}
        {user ? (
          <form onSubmit={handleReviewSubmit} className="mt-6 max-w-2xl rounded-2xl border border-paper-line bg-white p-6">
            <p className="font-serif text-lg text-ink">Leave a review</p>
            <div className="mt-4 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setReviewRating(n)}
                  className="p-1"
                  aria-label={`${n} stars`}
                >
                  <Star
                    className={`h-6 w-6 transition-colors ${n <= reviewRating ? 'fill-clay-400 text-clay-400' : 'text-ink-faint'}`}
                    strokeWidth={0}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={3}
              className="field mt-4 resize-none"
              placeholder="Share your thoughts on this piece…"
            />
            {reviewError && <p className="mt-2 font-sans text-sm text-clay-600">{reviewError}</p>}
            <button type="submit" disabled={reviewSubmitting} className="btn-accent mt-4">
              {reviewSubmitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : 'Submit review'}
            </button>
          </form>
        ) : (
          <p className="mt-4 font-sans text-sm text-ink-muted">
            <Link to="/login" className="font-medium text-clay-500 hover:text-clay-600">Sign in</Link> to leave a review.
          </p>
        )}

        {/* Review list */}
        {reviews.length > 0 && (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-2xl border border-paper-line bg-white p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-clay-100 font-sans text-sm font-medium text-clay-600">
                    {(review.reviewer?.display_name || 'A').charAt(0).toUpperCase()}
                  </span>
                  <div className="flex-1">
                    <p className="font-sans text-sm font-medium text-ink">{review.reviewer?.display_name || 'Anonymous'}</p>
                    <p className="font-sans text-xs text-ink-faint">{new Date(review.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`h-3.5 w-3.5 ${n <= review.rating ? 'fill-clay-400 text-clay-400' : 'text-ink-faint'}`} strokeWidth={0} />
                    ))}
                  </div>
                </div>
                {review.comment && <p className="mt-3 font-sans text-sm leading-relaxed text-ink-soft">{review.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Related works */}
      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="font-serif text-3xl font-light tracking-tightish text-ink">
            More from {artwork.artist.name}
          </h2>
          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4">
            {related.map((a) => (
              <ArtworkCard key={a.id} artwork={a} />
            ))}
          </div>
        </section>
      )}

      {/* Zoom modal */}
      {zoomOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 backdrop-blur-sm animate-fade-up"
          onClick={() => setZoomOpen(false)}
        >
          <button className="absolute right-5 top-5 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20" aria-label="Close">
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <img
            src={currentImage}
            alt={artwork.title}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function Spec({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="font-sans text-xs uppercase tracking-wider2 text-ink-faint">{label}</dt>
      <dd className="mt-1.5 font-sans text-sm text-ink">{value || '—'}</dd>
    </div>
  );
}

function Trust({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-clay-500">{icon}</span>
      <p className="font-sans text-xs leading-relaxed text-ink-muted">{label}</p>
    </div>
  );
}
