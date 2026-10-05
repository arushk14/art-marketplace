import { useEffect, useState } from 'react';
import { Link, navigate } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import {
  fetchArtistByUserId,
  fetchArtworksByArtist,
  deleteArtwork,
  fetchArtistPurchases,
  startStripeConnect,
  getStripeConnectStatus,
} from '@/lib/data';
import { formatPrice } from '@/lib/format';
import type { Artist, Artwork, PurchaseWithDetails, StripeConnectStatus } from '@/lib/types';
import { Palette, Plus, Trash2, Pencil, BarChart3, DollarSign, TrendingUp, ArrowRight, Package, CreditCard, Check, AlertCircle, ExternalLink, Loader2, Wallet } from 'lucide-react';

export function ArtistDashboardPage() {
  const { user, loading } = useAuth();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [purchases, setPurchases] = useState<PurchaseWithDetails[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'inventory' | 'sales' | 'payouts'>('overview');

  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }
    if (!user) return;

    Promise.all([fetchArtistByUserId(user.id)])
      .then(async ([a]) => {
        setArtist(a);
        if (a) {
          const [works, purchs] = await Promise.all([
            fetchArtworksByArtist(a.id),
            fetchArtistPurchases(a.id),
          ]);
          setArtworks(works);
          setPurchases(purchs);
        }
        setDataLoading(false);
      })
      .catch(() => setDataLoading(false));
  }, [user, loading]);

  useEffect(() => {
    if (artist && tab === 'payouts') {
      loadStripeStatus();
    }
  }, [artist, tab]);

  const loadStripeStatus = async () => {
    setStripeLoading(true);
    setStripeError(null);
    const { status, error } = await getStripeConnectStatus();
    if (error) {
      setStripeError(error);
    } else if (status) {
      setStripeStatus(status);
    }
    setStripeLoading(false);
  };

  const handleConnect = async () => {
    setStripeLoading(true);
    setStripeError(null);
    const { url, error } = await startStripeConnect();
    if (error) {
      setStripeError(error);
      setStripeLoading(false);
      return;
    }
    if (url) {
      window.location.href = url;
    } else {
      setStripeError('Something went wrong. Please try again.');
      setStripeLoading(false);
    }
  };

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

  if (!artist) {
    return (
      <div className="container-content flex flex-col items-center justify-center gap-5 py-24 text-center">
        <Palette className="h-10 w-10 text-ink-faint" strokeWidth={1} />
        <div>
          <p className="font-serif text-2xl text-ink">Set up your artist profile</p>
          <p className="mt-2 font-sans text-sm text-ink-muted">Create your profile to start uploading and selling artwork.</p>
        </div>
        <Link to="/artist-profile-edit" className="btn-accent">
          Create artist profile
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Link>
      </div>
    );
  }

  const availableCount = artworks.filter((a) => a.status === 'available').length;
  const soldCount = artworks.filter((a) => a.status === 'sold').length;
  const paidPurchases = purchases.filter((p) => p.status === 'paid');
  const totalRevenue = paidPurchases.reduce((sum, p) => sum + p.amount_cents, 0) / 100;
  const totalFees = paidPurchases.reduce((sum, p) => sum + p.marketplace_fee_cents, 0) / 100;
  const totalEarnings = paidPurchases.reduce((sum, p) => sum + p.artist_amount_cents, 0) / 100;

  const handleDelete = async (artworkId: string) => {
    if (!confirm('Delete this artwork? This cannot be undone.')) return;
    const { error } = await deleteArtwork(artworkId);
    if (error) {
      alert(error);
      return;
    }
    setArtworks((prev) => prev.filter((a) => a.id !== artworkId));
  };

  return (
    <div className="container-content py-10 lg:py-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-eyebrow">Artist Dashboard</p>
          <h1 className="mt-2 font-serif text-4xl font-light tracking-tightish text-ink lg:text-5xl animate-fade-up">
            {artist.name}
          </h1>
          {artist.tagline && <p className="mt-2 font-sans text-sm text-ink-muted">{artist.tagline}</p>}
        </div>
        <div className="flex gap-3">
          <Link to={`/artist/${artist.slug}`} className="btn-outline">
            View public page
          </Link>
          <Link to="/artist-upload" className="btn-accent">
            <Plus className="h-4 w-4" strokeWidth={2} />
            Upload artwork
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-up-d1">
        <StatCard icon={<Package className="h-5 w-5" strokeWidth={1.5} />} label="Available works" value={availableCount.toString()} />
        <StatCard icon={<TrendingUp className="h-5 w-5" strokeWidth={1.5} />} label="Sold works" value={soldCount.toString()} />
        <StatCard icon={<DollarSign className="h-5 w-5" strokeWidth={1.5} />} label="Total earnings" value={formatPrice(totalEarnings)} />
        <StatCard icon={<BarChart3 className="h-5 w-5" strokeWidth={1.5} />} label="Marketplace fees" value={formatPrice(totalFees)} />
      </div>

      {/* Quick Stripe status banner */}
      {!artist.stripe_charges_enabled && (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border border-clay-200 bg-clay-50 p-4 animate-fade-up-d2">
          <AlertCircle className="h-5 w-5 shrink-0 text-clay-500" strokeWidth={1.5} />
          <div className="flex-1">
            <p className="font-sans text-sm font-medium text-ink">Stripe not connected</p>
            <p className="font-sans text-xs text-ink-muted">Connect your Stripe account to receive payouts when your artwork sells.</p>
          </div>
          <button onClick={() => setTab('payouts')} className="btn-outline border-clay-300 text-clay-600 hover:bg-clay-100">
            Set up payouts
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-10 flex gap-1 border-b border-paper-line">
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')} label="Overview" />
        <TabButton active={tab === 'inventory'} onClick={() => setTab('inventory')} label="Inventory" />
        <TabButton active={tab === 'sales'} onClick={() => setTab('sales')} label="Sales" />
        <TabButton active={tab === 'payouts'} onClick={() => setTab('payouts')} label="Payouts" />
      </div>

      <div className="mt-8">
        {tab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card-surface p-6">
              <h2 className="font-serif text-xl text-ink">Recent works</h2>
              <ul className="mt-4 space-y-3">
                {artworks.slice(0, 5).map((w) => (
                  <li key={w.id} className="flex items-center gap-3">
                    <img src={w.image_url} alt={w.title} className="h-12 w-10 rounded-lg object-cover" />
                    <div className="flex-1">
                      <span className="font-sans text-sm font-medium text-ink">{w.title}</span>
                      <span className="block font-sans text-xs text-ink-faint">{w.status === 'sold' ? 'Sold' : formatPrice(Number(w.price))}</span>
                    </div>
                    <Link to={`/artist/${artist.slug}/edit/${w.slug}`} className="rounded-full p-2 text-ink-muted transition-colors hover:bg-paper-deep hover:text-ink">
                      <Pencil className="h-4 w-4" strokeWidth={1.5} />
                    </Link>
                  </li>
                ))}
                {artworks.length === 0 && <li className="font-sans text-sm text-ink-muted">No works uploaded yet.</li>}
              </ul>
            </div>

            <div className="card-surface p-6">
              <h2 className="font-serif text-xl text-ink">Profile</h2>
              <div className="mt-4 flex items-center gap-4">
                {artist.portrait_url && <img src={artist.portrait_url} alt={artist.name} className="h-16 w-16 rounded-full object-cover" />}
                <div>
                  <p className="font-sans text-sm font-medium text-ink">{artist.name}</p>
                  <p className="font-sans text-xs text-ink-muted">{artist.location || 'Location not set'}</p>
                  <p className="font-sans text-xs text-ink-faint">{artist.specialties.join(', ') || 'No specialties'}</p>
                </div>
              </div>
              <Link to="/artist-profile-edit" className="btn-outline mt-4 w-full justify-center">
                <Pencil className="h-4 w-4" strokeWidth={1.5} />
                Edit profile
              </Link>
            </div>
          </div>
        )}

        {tab === 'inventory' && (
          artworks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-paper-line py-20 text-center">
              <Palette className="h-8 w-8 text-ink-faint" strokeWidth={1} />
              <div>
                <p className="font-serif text-xl text-ink">No artwork yet</p>
                <p className="mt-1 font-sans text-sm text-ink-muted">Upload your first piece to start selling.</p>
              </div>
              <Link to="/artist-upload" className="btn-accent">
                <Plus className="h-4 w-4" strokeWidth={2} />
                Upload artwork
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {artworks.map((w) => (
                <div key={w.id} className="card-surface overflow-hidden">
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-paper-deep">
                    <img src={w.image_url} alt={w.title} className="h-full w-full object-cover" />
                    {w.status === 'sold' && (
                      <span className="absolute right-3 top-3 rounded-full bg-paper px-3 py-1 label-eyebrow text-ink">Sold</span>
                    )}
                    {w.status === 'pending' && (
                      <span className="absolute right-3 top-3 rounded-full bg-amber-100 px-3 py-1 font-sans text-xs font-medium text-amber-700">Sale pending</span>
                    )}
                    {w.featured && (
                      <span className="absolute left-3 top-3 rounded-full bg-clay-500 px-3 py-1 font-sans text-xs font-medium text-white">Featured</span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-serif text-base text-ink">{w.title}</p>
                    <p className="mt-1 font-sans text-sm text-ink-muted">{formatPrice(Number(w.price))}</p>
                    <div className="mt-4 flex gap-2">
                      <Link to={`/artwork/${w.slug}`} className="flex-1 rounded-full border border-paper-line py-2 text-center font-sans text-xs font-medium text-ink-soft transition-colors hover:border-ink/20 hover:text-ink">
                        View
                      </Link>
                      <Link to={`/artist/${artist.slug}/edit/${w.slug}`} className="flex-1 rounded-full border border-paper-line py-2 text-center font-sans text-xs font-medium text-ink-soft transition-colors hover:border-ink/20 hover:text-ink">
                        Edit
                      </Link>
                      <button onClick={() => handleDelete(w.id)} className="rounded-full border border-paper-line p-2 text-clay-500 transition-colors hover:border-clay-300 hover:bg-clay-50" aria-label="Delete">
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'sales' && (
          <div className="card-surface p-6">
            <h2 className="font-serif text-xl text-ink">Sales history</h2>
            {paidPurchases.length === 0 ? (
              <p className="mt-8 text-center font-sans text-sm text-ink-muted">No sales yet. Keep uploading great work!</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {paidPurchases.map((p) => (
                  <li key={p.id} className="flex items-center gap-4 border-b border-paper-line pb-4 last:border-0">
                    <img src={p.artwork.image_url} alt={p.artwork.title} className="h-14 w-12 rounded-lg object-cover" />
                    <div className="flex-1">
                      <span className="font-sans text-sm font-medium text-ink">{p.artwork.title}</span>
                      <span className="block font-sans text-xs text-ink-faint">
                        {new Date(p.paid_at || p.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block font-sans text-sm font-medium text-sage-600">{formatPrice(p.amount_cents / 100)}</span>
                      <span className="font-sans text-xs text-ink-faint">Your earnings: {formatPrice(p.artist_amount_cents / 100)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'payouts' && (
          <div className="space-y-6">
            {/* Stripe status card */}
            <div className="card-surface p-6">
              <div className="flex items-center gap-3">
                <Wallet className="h-6 w-6 text-clay-500" strokeWidth={1.5} />
                <h2 className="font-serif text-xl text-ink">Stripe Connect</h2>
              </div>

              {stripeLoading && !stripeStatus ? (
                <div className="mt-6 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-ink-muted" strokeWidth={1.5} />
                  <span className="font-sans text-sm text-ink-muted">Checking Stripe status…</span>
                </div>
              ) : stripeError ? (
                <div className="mt-6">
                  <p className="font-sans text-sm text-clay-600">{stripeError}</p>
                  <button onClick={loadStripeStatus} className="btn-outline mt-4">Try again</button>
                </div>
              ) : stripeStatus ? (
                <div className="mt-6 space-y-5">
                  {/* Status badge */}
                  <div className="flex items-center gap-3">
                    {(() => {
                      if (!stripeStatus.connected) {
                        return <StatusBadge color="clay" icon={<AlertCircle className="h-4 w-4" strokeWidth={1.5} />} label="Not Connected" />;
                      }
                      if (!stripeStatus.onboarding_complete) {
                        return <StatusBadge color="amber" icon={<AlertCircle className="h-4 w-4" strokeWidth={1.5} />} label="Setup Required" />;
                      }
                      if (stripeStatus.charges_enabled) {
                        return <StatusBadge color="sage" icon={<Check className="h-4 w-4" strokeWidth={1.5} />} label="Connected" />;
                      }
                      return <StatusBadge color="amber" icon={<AlertCircle className="h-4 w-4" strokeWidth={1.5} />} label="Payouts Unavailable" />;
                    })()}
                  </div>

                  {/* Details */}
                  {stripeStatus.connected && (
                    <dl className="grid grid-cols-2 gap-4 border-t border-paper-line pt-4">
                      <div>
                        <dt className="font-sans text-xs uppercase tracking-wider2 text-ink-faint">Payouts enabled</dt>
                        <dd className="mt-1 flex items-center gap-1.5 font-sans text-sm text-ink">
                          {stripeStatus.payouts_enabled ? (
                            <><Check className="h-4 w-4 text-sage-500" strokeWidth={2} /> Yes</>
                          ) : (
                            <><AlertCircle className="h-4 w-4 text-amber-500" strokeWidth={2} /> No</>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-sans text-xs uppercase tracking-wider2 text-ink-faint">Charges enabled</dt>
                        <dd className="mt-1 flex items-center gap-1.5 font-sans text-sm text-ink">
                          {stripeStatus.charges_enabled ? (
                            <><Check className="h-4 w-4 text-sage-500" strokeWidth={2} /> Yes</>
                          ) : (
                            <><AlertCircle className="h-4 w-4 text-amber-500" strokeWidth={2} /> No</>
                          )}
                        </dd>
                      </div>
                    </dl>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3">
                    {!stripeStatus.connected && (
                      <button onClick={handleConnect} disabled={stripeLoading} className="btn-accent">
                        {stripeLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
                        ) : (
                          <><CreditCard className="h-5 w-5" strokeWidth={1.5} /> Connect Stripe Account</>
                        )}
                      </button>
                    )}
                    {stripeStatus.connected && !stripeStatus.onboarding_complete && stripeStatus.onboarding_url && (
                      <button onClick={() => window.location.href = stripeStatus.onboarding_url!} className="btn-accent">
                        <CreditCard className="h-5 w-5" strokeWidth={1.5} />
                        Complete onboarding
                      </button>
                    )}
                    {stripeStatus.connected && stripeStatus.onboarding_complete && stripeStatus.dashboard_url && (
                      <button onClick={() => window.location.href = stripeStatus.dashboard_url!} className="btn-outline">
                        <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                        Manage Stripe account
                      </button>
                    )}
                    <button onClick={loadStripeStatus} className="btn-outline">
                      Refresh status
                    </button>
                  </div>

                  {!stripeStatus.charges_enabled && stripeStatus.connected && (
                    <p className="rounded-lg bg-amber-50 px-4 py-3 font-sans text-sm text-amber-700">
                      Your Stripe account needs to be fully set up before buyers can purchase your artwork. Complete the onboarding process to enable payments.
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            {/* Earnings summary */}
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard icon={<DollarSign className="h-5 w-5" strokeWidth={1.5} />} label="Total earnings" value={formatPrice(totalEarnings)} />
              <StatCard icon={<BarChart3 className="h-5 w-5" strokeWidth={1.5} />} label="Marketplace fees (10%)" value={formatPrice(totalFees)} />
              <StatCard icon={<TrendingUp className="h-5 w-5" strokeWidth={1.5} />} label="Total sales" value={formatPrice(totalRevenue)} />
            </div>
          </div>
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

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-4 py-3 font-sans text-sm font-medium transition-colors ${
        active ? 'border-clay-500 text-ink' : 'border-transparent text-ink-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  );
}

function StatusBadge({ color, icon, label }: { color: 'clay' | 'amber' | 'sage'; icon: React.ReactNode; label: string }) {
  const colors = {
    clay: 'bg-clay-50 text-clay-600 border-clay-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    sage: 'bg-sage-50 text-sage-600 border-sage-200',
  };
  return (
    <span className={`flex items-center gap-2 rounded-full border px-4 py-2 font-sans text-sm font-medium ${colors[color]}`}>
      {icon}
      {label}
    </span>
  );
}
