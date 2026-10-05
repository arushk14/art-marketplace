import { useMemo, useState } from 'react';
import { Link } from '@/lib/router';
import { useCart } from '@/lib/cart';
import { formatPrice } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import { startStripeCartCheckout } from '@/lib/data';
import { setCheckoutQueue, type QueuedCheckoutGroup } from '@/lib/checkoutQueue';
import type { CartItem } from '@/lib/types';
import { ArrowLeft, ArrowRight, CreditCard, Loader2, Truck } from 'lucide-react';

interface ArtistGroup {
  artistId: string;
  artistName: string;
  items: CartItem[];
  subtotal: number;
}

function groupByArtist(items: CartItem[]): ArtistGroup[] {
  const map = new Map<string, ArtistGroup>();
  for (const item of items) {
    // Cart items saved before artistId was tracked fall back to grouping by
    // artwork — each becomes its own checkout step rather than risking being
    // silently merged with an unrelated artist's items.
    const key = item.artistId || item.artworkId;
    const existing = map.get(key);
    if (existing) {
      existing.items.push(item);
      existing.subtotal += item.price;
    } else {
      map.set(key, { artistId: key, artistName: item.artistName, items: [item], subtotal: item.price });
    }
  }
  return [...map.values()];
}

export function CheckoutPage() {
  const items = useCart();
  const { user } = useAuth();
  const groups = useMemo(() => groupByArtist(items), [items]);
  const subtotal = items.reduce((sum, i) => sum + i.price, 0);

  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="container-content flex flex-col items-center justify-center gap-5 py-32 text-center">
        <p className="font-serif text-3xl text-ink">Please sign in to checkout</p>
        <Link to="/login" className="btn-accent">
          Sign in
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-content flex flex-col items-center justify-center gap-5 py-32 text-center">
        <p className="font-serif text-3xl text-ink">Your cart is empty</p>
        <Link to="/shop" className="btn-outline">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Browse the collection
        </Link>
      </div>
    );
  }

  const handlePay = async () => {
    setSubmitting(true);
    setCheckoutError(null);

    const [first, ...rest] = groups;
    const { url, error } = await startStripeCartCheckout(first.items.map((i) => i.artworkId));
    if (error) {
      setCheckoutError(error);
      setSubmitting(false);
      return;
    }
    if (!url) {
      setCheckoutError('Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }

    const queued: QueuedCheckoutGroup[] = rest.map((g) => ({ artistName: g.artistName, artworkIds: g.items.map((i) => i.artworkId) }));
    setCheckoutQueue(queued);
    window.location.href = url;
  };

  return (
    <div className="container-content py-12 lg:py-16">
      <Link
        to="/cart"
        className="label-eyebrow mb-6 inline-flex items-center gap-1.5 transition-colors hover:text-clay-500"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Back to cart
      </Link>
      <h1 className="font-serif text-5xl font-light tracking-tightish text-ink animate-fade-up">
        Checkout
      </h1>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        {/* Grouped items */}
        <div className="space-y-10">
          {groups.length > 1 && (
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4 animate-fade-up">
              <Truck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" strokeWidth={1.5} />
              <div>
                <p className="font-sans text-sm font-medium text-amber-800">
                  Your cart has pieces from {groups.length} different artists
                </p>
                <p className="mt-1 font-sans text-xs leading-relaxed text-amber-700">
                  Stripe pays each artist directly, so you'll complete payment in {groups.length} steps — one per artist. You'll be guided through each one in turn.
                </p>
              </div>
            </div>
          )}

          {groups.map((group, i) => (
            <section key={group.artistId} className="animate-fade-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-baseline justify-between">
                <h2 className="font-serif text-2xl text-ink">{group.artistName}</h2>
                {groups.length > 1 && (
                  <span className="label-eyebrow text-ink-faint">Payment {i + 1} of {groups.length}</span>
                )}
              </div>
              <ul className="mt-4 space-y-4">
                {group.items.map((item) => (
                  <li key={item.artworkId} className="flex gap-3">
                    <img src={item.image_url} alt={item.title} className="h-16 w-14 rounded-lg object-cover" />
                    <div className="flex flex-1 flex-col justify-center">
                      <span className="font-sans text-sm font-medium leading-snug text-ink">{item.title}</span>
                      <span className="mt-1 font-sans text-sm text-ink">{formatPrice(item.price)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <div className="flex items-start gap-3 rounded-xl bg-paper-warm p-4 animate-fade-up-d1">
            <Truck className="mt-0.5 h-5 w-5 shrink-0 text-clay-500" strokeWidth={1.5} />
            <p className="font-sans text-xs leading-relaxed text-ink-soft">
              Payment is processed securely by Stripe. You'll enter your shipping address and card details on Stripe's checkout page — each artist ships insured, directly from their studio.
            </p>
          </div>
        </div>

        {/* Order summary */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="card-surface p-6 animate-fade-up-d2">
            <h2 className="font-serif text-xl text-ink">Order Summary</h2>
            <dl className="mt-6 space-y-3 border-t border-paper-line pt-5">
              <div className="flex justify-between">
                <dt className="font-sans text-sm text-ink-muted">Items ({items.length})</dt>
                <dd className="font-sans text-sm text-ink">{formatPrice(subtotal)}</dd>
              </div>
            </dl>
            <div className="mt-5 flex items-center justify-between border-t border-paper-line pt-5">
              <span className="font-serif text-lg text-ink">Total</span>
              <span className="font-serif text-2xl text-ink">{formatPrice(subtotal)}</span>
            </div>

            {checkoutError && (
              <p className="mt-4 rounded-lg bg-clay-50 px-4 py-3 font-sans text-sm text-clay-600">{checkoutError}</p>
            )}

            <button
              type="button"
              onClick={handlePay}
              disabled={submitting}
              className="btn-accent mt-6 w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                  Redirecting to Stripe…
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" strokeWidth={1.5} />
                  {groups.length > 1 ? `Pay ${groups[0].artistName} · ${formatPrice(groups[0].subtotal)}` : `Pay with Stripe · ${formatPrice(subtotal)}`}
                </>
              )}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
