import { useEffect } from 'react';
import { Link, navigate } from '@/lib/router';
import { cartStore, useCart } from '@/lib/cart';
import { formatPrice } from '@/lib/format';
import { X, ShoppingBag, ArrowRight } from 'lucide-react';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const items = useCart();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const subtotal = items.reduce((sum, i) => sum + i.price, 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-paper shadow-2xl transition-transform duration-400 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Shopping cart"
        aria-hidden={!open}
      >
        <header className="flex items-center justify-between border-b border-paper-line px-6 py-5">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-ink" strokeWidth={1.5} />
            <h2 className="font-serif text-xl text-ink">Your Cart</h2>
            <span className="font-sans text-sm text-ink-muted">({items.length})</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-ink-muted transition-colors hover:bg-paper-deep hover:text-ink"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-paper-deep">
              <ShoppingBag className="h-8 w-8 text-ink-faint" strokeWidth={1.25} />
            </div>
            <div>
              <p className="font-serif text-lg text-ink">Your cart is empty</p>
              <p className="mt-1 font-sans text-sm text-ink-muted">
                Discover original pieces from artists around the world.
              </p>
            </div>
            <Link to="/shop" className="btn-primary" onClick={onClose}>
              Browse the Collection
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <ul className="space-y-5">
                {items.map((item) => (
                  <li key={item.artworkId} className="flex gap-4">
                    <Link
                      to={`/artwork/${item.slug}`}
                      onClick={onClose}
                      className="shrink-0"
                    >
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="h-24 w-20 rounded-lg object-cover"
                      />
                    </Link>
                    <div className="flex flex-1 flex-col">
                      <Link
                        to={`/artwork/${item.slug}`}
                        onClick={onClose}
                        className="font-serif text-base leading-snug text-ink hover:text-clay-600"
                      >
                        {item.title}
                      </Link>
                      <Link
                        to={`/artist/${item.artistSlug}`}
                        onClick={onClose}
                        className="mt-0.5 font-sans text-xs text-ink-muted hover:text-ink"
                      >
                        {item.artistName}
                      </Link>
                      <div className="mt-auto flex items-center justify-between">
                        <span className="font-sans text-sm font-medium text-ink">
                          {formatPrice(item.price)}
                        </span>
                        <button
                          onClick={() => cartStore.remove(item.artworkId)}
                          className="font-sans text-xs text-ink-faint underline-offset-2 transition-colors hover:text-clay-500 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <footer className="border-t border-paper-line px-6 py-5">
              <div className="flex items-center justify-between">
                <span className="label-eyebrow">Subtotal</span>
                <span className="font-serif text-2xl text-ink">
                  {formatPrice(subtotal)}
                </span>
              </div>
              <p className="mt-1.5 font-sans text-xs text-ink-muted">
                Shipping and taxes calculated at checkout.
              </p>
              <button
                onClick={() => {
                  onClose();
                  navigate('/checkout');
                }}
                className="btn-primary mt-4 w-full"
              >
                Proceed to Checkout
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
