import { Link, navigate } from '@/lib/router';
import { useCart, cartStore } from '@/lib/cart';
import { formatPrice } from '@/lib/format';
import { ShoppingBag, ArrowRight, Trash2 } from 'lucide-react';

export function CartPage() {
  const items = useCart();
  const subtotal = items.reduce((sum, i) => sum + i.price, 0);

  if (items.length === 0) {
    return (
      <div className="container-content flex flex-col items-center justify-center gap-6 py-32 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-paper-deep">
          <ShoppingBag className="h-8 w-8 text-ink-faint" strokeWidth={1.25} />
        </div>
        <div>
          <p className="font-serif text-3xl text-ink">Your cart is empty</p>
          <p className="mt-2 font-sans text-sm text-ink-muted">
            Discover original pieces from artists around the world.
          </p>
        </div>
        <Link to="/shop" className="btn-primary">
          Browse the Collection
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Link>
      </div>
    );
  }

  return (
    <div className="container-content py-12 lg:py-16">
      <p className="label-eyebrow animate-fade-up">Cart</p>
      <h1 className="mt-3 font-serif text-5xl font-light tracking-tightish text-ink animate-fade-up-d1">
        Your selection
      </h1>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1.6fr_1fr]">
        {/* Items */}
        <ul className="space-y-8">
          {items.map((item) => (
            <li
              key={item.artworkId}
              className="flex gap-6 border-b border-paper-line pb-8 animate-fade-up"
            >
              <Link to={`/artwork/${item.slug}`} className="shrink-0">
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="h-36 w-32 rounded-xl object-cover sm:h-44 sm:w-40"
                />
              </Link>
              <div className="flex flex-1 flex-col">
                <Link
                  to={`/artist/${item.artistSlug}`}
                  className="label-eyebrow transition-colors hover:text-clay-500"
                >
                  {item.artistName}
                </Link>
                <Link
                  to={`/artwork/${item.slug}`}
                  className="mt-2 font-serif text-2xl text-ink transition-colors hover:text-clay-600"
                >
                  {item.title}
                </Link>
                <div className="mt-auto flex items-center justify-between pt-4">
                  <span className="font-serif text-xl text-ink">
                    {formatPrice(item.price)}
                  </span>
                  <button
                    onClick={() => cartStore.remove(item.artworkId)}
                    className="flex items-center gap-1.5 font-sans text-xs text-ink-faint transition-colors hover:text-clay-500"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Summary */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="card-surface p-6 animate-fade-up-d1">
            <h2 className="font-serif text-xl text-ink">Order Summary</h2>
            <dl className="mt-6 space-y-4">
              <div className="flex justify-between">
                <dt className="font-sans text-sm text-ink-muted">Subtotal</dt>
                <dd className="font-sans text-sm font-medium text-ink">
                  {formatPrice(subtotal)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-sans text-sm text-ink-muted">Shipping</dt>
                <dd className="font-sans text-sm text-ink-muted">Calculated at checkout</dd>
              </div>
            </dl>
            <div className="mt-6 flex items-center justify-between border-t border-paper-line pt-6">
              <span className="font-serif text-lg text-ink">Total</span>
              <span className="font-serif text-2xl text-ink">
                {formatPrice(subtotal)}
              </span>
            </div>
            <button
              onClick={() => navigate('/checkout')}
              className="btn-accent mt-6 w-full"
            >
              Proceed to Checkout
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </button>
            <Link
              to="/shop"
              className="mt-3 block text-center font-sans text-sm text-ink-muted transition-colors hover:text-ink"
            >
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
