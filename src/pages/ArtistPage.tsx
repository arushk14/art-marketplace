import { useEffect, useState } from 'react';
import { Link, navigate } from '@/lib/router';
import { ArtworkCard } from '@/components/ArtworkCard';
import { fetchArtistBySlug, fetchArtworksByArtist, toggleFollow, isFollowing, fetchFollowerCount } from '@/lib/data';
import { formatPrice } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import type { Artist, Artwork } from '@/lib/types';
import { ArrowLeft, MapPin, Sparkles, Grid2x2, Heart, Globe, Instagram, Twitter, Users } from 'lucide-react';

export function ArtistPage({ slug }: { slug: string }) {
  const { user } = useAuth();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    fetchArtistBySlug(slug)
      .then((data) => {
        if (!active) return;
        setArtist(data);
        setLoading(false);
        if (data) {
          // Secondary data (works/follower count/follow status) is
          // non-critical — a failure here must never knock out a page that
          // already found its artist, so it's isolated from the primary catch.
          Promise.all([
            fetchArtworksByArtist(data.id),
            fetchFollowerCount(data.id),
          ])
            .then(([works, fc]) => {
              if (!active) return;
              setArtworks(works);
              setFollowerCount(fc);
            })
            .catch((err) => console.error('Failed to load artist extras', err));

          if (user) {
            isFollowing(data.id)
              .then((f) => { if (active) setFollowing(f); })
              .catch(() => {});
          }
        }
      })
      .catch(() => {
        if (active) { setError(true); setLoading(false); }
      });
    return () => { active = false; };
  }, [slug, user]);

  const handleFollow = async () => {
    if (!artist) return;
    if (!user) { navigate('/login'); return; }
    const { following: f, error } = await toggleFollow(artist.id);
    if (error) return;
    setFollowing(f);
    setFollowerCount((c) => f ? c + 1 : Math.max(0, c - 1));
  };

  if (loading) {
    return (
      <div className="container-content py-12">
        <div className="shimmer mb-10 h-6 w-40 rounded" />
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
          <div className="shimmer aspect-[4/5] w-full rounded-2xl" />
          <div className="space-y-5 pt-4">
            <div className="shimmer h-16 w-3/4 rounded" />
            <div className="shimmer h-5 w-1/3 rounded" />
            <div className="shimmer h-40 w-full rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="container-content flex flex-col items-center justify-center gap-5 py-32 text-center">
        <p className="font-serif text-3xl text-ink">Artist not found</p>
        <Link to="/artists" className="btn-outline">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Back to artists
        </Link>
      </div>
    );
  }

  const selectedWorks = artworks.filter((a) => a.featured);
  const fullCollection = artworks;
  const availableCount = artworks.filter((a) => a.status === 'available').length;
  const priceRange = artworks.length
    ? {
        min: Math.min(...artworks.map((a) => Number(a.price))),
        max: Math.max(...artworks.map((a) => Number(a.price))),
      }
    : null;

  const socialLinks: { url: string; icon: React.ReactNode; label: string }[] = [];
  if (artist.website) socialLinks.push({ url: artist.website, icon: <Globe className="h-4 w-4" strokeWidth={1.5} />, label: 'Website' });
  if (artist.instagram) socialLinks.push({ url: artist.instagram.startsWith('http') ? artist.instagram : `https://instagram.com/${artist.instagram.replace('@', '')}`, icon: <Instagram className="h-4 w-4" strokeWidth={1.5} />, label: 'Instagram' });
  if (artist.twitter) socialLinks.push({ url: artist.twitter.startsWith('http') ? artist.twitter : `https://twitter.com/${artist.twitter.replace('@', '')}`, icon: <Twitter className="h-4 w-4" strokeWidth={1.5} />, label: 'Twitter' });

  return (
    <div>
      {/* Hero / portrait band */}
      <section className="bg-paper-warm">
        <div className="container-content grid gap-10 py-12 lg:grid-cols-[1fr_1.6fr] lg:py-16">
          {/* Portrait */}
          <div className="relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-2xl bg-paper-deep shadow-sm animate-scale-in">
            {artist.portrait_url ? (
              <img src={artist.portrait_url} alt={artist.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-paper-deep" />
            )}
          </div>

          {/* Bio */}
          <div className="flex flex-col justify-center animate-fade-up">
            <Link
              to="/artists"
              className="label-eyebrow mb-4 inline-flex items-center gap-1.5 transition-colors hover:text-clay-500"
            >
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
              The Roster
            </Link>
            <h1 className="font-serif text-5xl font-light leading-[1.05] tracking-tightish text-ink lg:text-6xl">
              {artist.name}
            </h1>
            {artist.tagline && (
              <p className="mt-4 font-serif text-xl font-light italic text-ink-soft">{artist.tagline}</p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-5">
              {artist.location && (
                <span className="flex items-center gap-2 font-sans text-sm text-ink-muted">
                  <MapPin className="h-4 w-4" strokeWidth={1.5} />
                  {artist.location}
                </span>
              )}
              {priceRange && (
                <span className="font-sans text-sm text-ink-muted">
                  Works from {formatPrice(priceRange.min)} – {formatPrice(priceRange.max)}
                </span>
              )}
              <span className="font-sans text-sm text-ink-muted">
                {availableCount} {availableCount === 1 ? 'piece available' : 'pieces available'}
              </span>
              <span className="flex items-center gap-1.5 font-sans text-sm text-ink-muted">
                <Users className="h-4 w-4" strokeWidth={1.5} />
                {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
              </span>
            </div>

            {artist.specialties.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {artist.specialties.map((s) => (
                  <span key={s} className="rounded-full border border-paper-line bg-white px-3 py-1 font-sans text-xs font-medium text-ink-soft">
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* Follow + social */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={handleFollow}
                className={following ? 'btn-outline border-clay-300 text-clay-600 hover:bg-clay-50' : 'btn-accent'}
              >
                <Heart className="h-4 w-4" strokeWidth={1.5} fill={following ? 'currentColor' : 'none'} />
                {following ? 'Following' : 'Follow artist'}
              </button>
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-paper-line p-2.5 text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
                  aria-label={link.label}
                >
                  {link.icon}
                </a>
              ))}
            </div>

            {artist.bio && (
              <p className="mt-7 max-w-2xl font-sans text-base leading-relaxed text-ink-soft text-pretty">
                {artist.bio}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Selected Works */}
      {selectedWorks.length > 0 && (
        <section className="container-content py-16 lg:py-20">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-clay-500" strokeWidth={1.5} />
            <div>
              <p className="label-eyebrow">The artist's best</p>
              <h2 className="mt-2 font-serif text-4xl font-light tracking-tightish text-ink">Selected Works</h2>
            </div>
          </div>
          <p className="mt-4 max-w-2xl font-sans text-base leading-relaxed text-ink-muted">
            A curated selection of {artist.name.split(' ')[0]}'s most celebrated pieces — the works that define this practice.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-12">
            {selectedWorks.slice(0, 3).map((work, i) => {
              const spans = ['md:col-span-7 md:row-span-2', 'md:col-span-5', 'md:col-span-5'];
              return (
                <SelectedWorkTile key={work.id} work={work} className={spans[i] ?? 'md:col-span-6'} large={i === 0} />
              );
            })}
          </div>

          {selectedWorks.length > 3 && (
            <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4">
              {selectedWorks.slice(3).map((work) => (
                <ArtworkCard key={work.id} artwork={{ ...work, artist }} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Full collection */}
      <section className="bg-paper-warm py-16 lg:py-20">
        <div className="container-content">
          <div className="flex items-center gap-3">
            <Grid2x2 className="h-6 w-6 text-ink" strokeWidth={1.5} />
            <div>
              <p className="label-eyebrow">Everything on display</p>
              <h2 className="mt-2 font-serif text-4xl font-light tracking-tightish text-ink">The Full Collection</h2>
            </div>
          </div>
          <p className="mt-4 max-w-2xl font-sans text-base leading-relaxed text-ink-muted">
            Every available work by {artist.name.split(' ')[0]}, newest first.
          </p>

          {fullCollection.length === 0 ? (
            <p className="mt-12 font-sans text-sm text-ink-muted">No works currently on display.</p>
          ) : (
            <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
              {fullCollection.map((work, i) => (
                <div key={work.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}>
                  <ArtworkCard artwork={{ ...work, artist }} priority={i < 4} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SelectedWorkTile({ work, className, large }: { work: Artwork; className?: string; large?: boolean }) {
  const sold = work.status === 'sold';
  return (
    <Link
      to={`/artwork/${work.slug}`}
      className={`group relative block overflow-hidden rounded-2xl bg-paper-deep ${
        large ? 'aspect-[4/5] md:aspect-auto md:min-h-[560px]' : 'aspect-[4/5]'
      } ${className ?? ''}`}
    >
      <img
        src={work.image_url}
        alt={work.title}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/0 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-90" />
      {sold && (
        <div className="absolute right-4 top-4 rounded-full bg-paper px-3 py-1 label-eyebrow text-ink">Sold</div>
      )}
      <div className="absolute inset-x-0 bottom-0 p-6">
        <h3 className={`font-serif text-paper ${large ? 'text-2xl' : 'text-xl'}`}>{work.title}</h3>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="font-sans text-sm text-paper/80">{work.medium}</span>
          <span className="font-sans text-sm font-medium text-paper">{formatPrice(Number(work.price))}</span>
        </div>
      </div>
    </Link>
  );
}
