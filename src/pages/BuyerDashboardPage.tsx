import { useEffect, useState } from 'react';
import { Link, navigate } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { fetchOrders, fetchWishlist, fetchFollowedArtists, fetchBuyerPurchases } from '@/lib/data';
import { formatPrice } from '@/lib/format';
import type { OrderWithItems, WishlistItem, Artist, PurchaseWithDetails } from '@/lib/types';
import { ShoppingBag, Heart, Users, Package, ArrowRight } from 'lucide-react';
import { ArtworkCard } from '@/components/ArtworkCard';

export function BuyerDashboardPage() {
  const { user, profile, loading } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [purchases, setPurchases] = useState<PurchaseWithDetails[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [followed, setFollowed] = useState<Artist[]>([]);
  const [tab, setTab] = useState<'orders' | 'wishlist' | 'following'>('orders');
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }
    if (!user) return;

    Promise.all([fetchOrders(), fetchWishlist(), fetchFollowedArtists(user.id), fetchBuyerPurchases()])
      .then(([o, w, f, p]) => {
        setOrders(o);
        setWishlist(w);
        setFollowed(f);
        setPurchases(p);
      })
      .catch((err) => console.error('Dashboard load failed', err))
      .finally(() => setDataLoading(false));
  }, [user, loading]);

  if (loading || (user && dataLoading)) {
    return (
      <div className="container-content py-16">
        <div className="shimmer h-12 w-64 rounded" />
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="shimmer h-28 rounded-2xl" />
          <div className="shimmer h-28 rounded-2xl" />
          <div className="shimmer h-28 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const totalSpent = orders.reduce((sum, o) => sum + Number(o.total), 0)
    + purchases.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.amount_cents, 0) / 100;

  return (
    <div className="container-content py-10 lg:py-14">
      <p className="label-eyebrow">Buyer Dashboard</p>
      <h1 className="mt-2 font-serif text-4xl font-light tracking-tightish text-ink lg:text-5xl animate-fade-up">
        Hello, {profile?.display_name || 'collector'}
      </h1>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3 animate-fade-up-d1">
        <StatCard icon={<Package className="h-5 w-5" strokeWidth={1.5} />} label="Orders placed" value={orders.length.toString()} />
        <StatCard icon={<Heart className="h-5 w-5" strokeWidth={1.5} />} label="Wishlist items" value={wishlist.length.toString()} />
        <StatCard icon={<Users className="h-5 w-5" strokeWidth={1.5} />} label="Artists followed" value={followed.length.toString()} />
      </div>

      {totalSpent > 0 && (
        <p className="mt-4 font-sans text-sm text-ink-muted">
          Total spent: <span className="font-medium text-ink">{formatPrice(totalSpent)}</span>
        </p>
      )}

      {/* Tabs */}
      <div className="mt-10 flex gap-1 border-b border-paper-line">
        <TabButton active={tab === 'orders'} onClick={() => setTab('orders')} label="Orders" count={orders.length + purchases.length} />
        <TabButton active={tab === 'wishlist'} onClick={() => setTab('wishlist')} label="Wishlist" count={wishlist.length} />
        <TabButton active={tab === 'following'} onClick={() => setTab('following')} label="Following" count={followed.length} />
      </div>

      <div className="mt-8">
        {tab === 'orders' && (
          orders.length === 0 && purchases.length === 0 ? (
            <EmptyState icon={<ShoppingBag className="h-8 w-8" strokeWidth={1} />} title="No orders yet" subtitle="Browse the collection and find your next piece." ctaTo="/shop" ctaLabel="Browse the collection" />
          ) : (
            <div className="space-y-6">
              {/* Stripe purchases */}
              {purchases.map((p) => (
                <div key={p.id} className="card-surface p-5 animate-fade-up">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-line pb-4">
                    <div>
                      <p className="font-sans text-xs text-ink-faint">
                        Purchase #{p.id.slice(0, 8)} · {new Date(p.paid_at || p.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                      <p className="mt-1 font-serif text-lg text-ink">{formatPrice(p.amount_cents / 100)}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 font-sans text-xs font-medium ${
                      p.status === 'paid' ? 'bg-sage-50 text-sage-600' :
                      p.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                      p.status === 'refunded' ? 'bg-clay-50 text-clay-600' :
                      'bg-paper-deep text-ink-muted'
                    }`}>
                      {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </span>
                  </div>
                  <div className="mt-4 flex gap-3">
                    {p.artwork.image_url && (
                      <img src={p.artwork.image_url} alt={p.artwork.title} className="h-14 w-12 rounded-lg object-cover" />
                    )}
                    <div className="flex flex-1 flex-col justify-center">
                      <span className="font-sans text-sm font-medium text-ink">{p.artwork.title}</span>
                      <span className="font-sans text-xs text-ink-muted">by {p.artist.name}</span>
                    </div>
                    <Link to={`/artwork/${p.artwork.slug}`} className="self-center rounded-full border border-paper-line px-3 py-1.5 font-sans text-xs font-medium text-ink-soft transition-colors hover:border-ink/20 hover:text-ink">
                      View
                    </Link>
                  </div>
                </div>
              ))}
              {/* Legacy orders (cart-based) */}
              {orders.map((order) => (
                <div key={order.id} className="card-surface p-5 animate-fade-up">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-line pb-4">
                    <div>
                      <p className="font-sans text-xs text-ink-faint">
                        Order #{order.id.slice(0, 8)} · {new Date(order.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                      <p className="mt-1 font-serif text-lg text-ink">{formatPrice(Number(order.total))}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 font-sans text-xs font-medium ${
                      order.status === 'paid' ? 'bg-sage-50 text-sage-600' :
                      order.status === 'shipped' ? 'bg-blue-50 text-blue-600' :
                      order.status === 'delivered' ? 'bg-sage-100 text-sage-700' :
                      'bg-paper-deep text-ink-muted'
                    }`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                  <ul className="mt-4 space-y-3">
                    {order.items.map((item) => (
                      <li key={item.id} className="flex gap-3">
                        {item.image_url && (
                          <img src={item.image_url} alt={item.title} className="h-14 w-12 rounded-lg object-cover" />
                        )}
                        <div className="flex flex-1 flex-col justify-center">
                          <span className="font-sans text-sm font-medium text-ink">{item.title}</span>
                          <span className="font-sans text-xs text-ink-muted">{item.artist_name}</span>
                        </div>
                        <span className="self-center font-sans text-sm text-ink">{formatPrice(Number(item.price))}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'wishlist' && (
          wishlist.length === 0 ? (
            <EmptyState icon={<Heart className="h-8 w-8" strokeWidth={1} />} title="Your wishlist is empty" subtitle="Save pieces you love by tapping the heart on any artwork." ctaTo="/shop" ctaLabel="Browse the collection" />
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
              {wishlist.map((item) => (
                <ArtworkCard key={item.artwork_id} artwork={item.artwork} />
              ))}
            </div>
          )
        )}

        {tab === 'following' && (
          followed.length === 0 ? (
            <EmptyState icon={<Users className="h-8 w-8" strokeWidth={1} />} title="Not following any artists" subtitle="Follow artists to get updates on their new work." ctaTo="/artists" ctaLabel="Discover artists" />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {followed.map((artist) => (
                <Link
                  key={artist.id}
                  to={`/artist/${artist.slug}`}
                  className="group flex items-center gap-4 rounded-2xl border border-paper-line bg-white p-4 transition-all hover:border-ink/20 hover:shadow-sm"
                >
                  {artist.portrait_url && (
                    <img src={artist.portrait_url} alt={artist.name} className="h-16 w-16 rounded-full object-cover" />
                  )}
                  <div className="flex-1">
                    <p className="font-serif text-lg text-ink">{artist.name}</p>
                    <p className="font-sans text-sm text-ink-muted">{artist.tagline}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-ink-faint transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
                </Link>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card-surface flex items-center gap-4 p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-clay-50 text-clay-500">{icon}</span>
      <div>
        <p className="font-serif text-2xl text-ink">{value}</p>
        <p className="font-sans text-xs text-ink-muted">{label}</p>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-4 py-3 font-sans text-sm font-medium transition-colors ${
        active ? 'border-clay-500 text-ink' : 'border-transparent text-ink-muted hover:text-ink'
      }`}
    >
      {label}
      <span className="rounded-full bg-paper-deep px-2 py-0.5 font-sans text-xs text-ink-muted">{count}</span>
    </button>
  );
}

function EmptyState({ icon, title, subtitle, ctaTo, ctaLabel }: { icon: React.ReactNode; title: string; subtitle: string; ctaTo: string; ctaLabel: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-paper-line py-20 text-center">
      <span className="text-ink-faint">{icon}</span>
      <div>
        <p className="font-serif text-xl text-ink">{title}</p>
        <p className="mt-1 font-sans text-sm text-ink-muted">{subtitle}</p>
      </div>
      <Link to={ctaTo} className="btn-outline">
        {ctaLabel}
        <ArrowRight className="h-4 w-4" strokeWidth={2} />
      </Link>
    </div>
  );
}
