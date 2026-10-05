import { useEffect, useState } from 'react';
import { Link } from '@/components/ui/Link';
import { ArtworkCard } from '@/components/ArtworkCard';
import { ArtistCard } from '@/components/ArtistCard';
import { ArtworkGridSkeleton } from '@/components/ui/Skeleton';
import { ArrowRight, Palette, Image as ImageIcon, Users } from 'lucide-react';
import {
  fetchFeaturedArtists,
  fetchCuratedArtworks,
} from '@/lib/data';
import type { Artist, ArtworkWithArtist } from '@/lib/types';

export function HomePage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artworks, setArtworks] = useState<ArtworkWithArtist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const [a, w] = await Promise.all([
        fetchFeaturedArtists(),
        fetchCuratedArtworks(8),
      ]);
      if (!active) return;
      setArtists(a);
      setArtworks(w);
      setLoading(false);
    })().catch((err) => {
      console.error('Failed to load home content', err);
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const heroArtwork = artworks[0];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container-content grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          {/* Copy */}
          <div className="max-w-xl">
            <p className="label-eyebrow animate-fade-up">Online Art Marketplace</p>
            <h1 className="mt-5 font-serif text-5xl font-light leading-[1.05] tracking-tightish text-ink text-balance animate-fade-up-d1 sm:text-6xl lg:text-7xl">
              Collect original art from independent artists.
            </h1>
            <p className="mt-6 max-w-md font-sans text-lg leading-relaxed text-ink-soft text-pretty animate-fade-up-d2">
              One-of-a-kind paintings, watercolors, photography, and sculpture —
              each piece made by hand, ready to find a home on your wall.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4 animate-fade-up-d3">
              <Link to="/shop" className="btn-accent">
                Browse the Collection
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
              <Link to="/artists" className="btn-outline">
                Meet the Artists
              </Link>
            </div>

            <div className="mt-14 flex gap-10 animate-fade-up-d4">
              <Stat value={String(artists.length)} label="Independent artists" />
              <Stat value={String(artworks.length)} label="Original works" />
              <Stat value="4" label="Mediums" />
            </div>
          </div>

          {/* Hero image collage / placeholder */}
          <div className="relative h-[440px] sm:h-[520px] lg:h-[600px]">
            {heroArtwork ? (
              <>
                <div className="absolute right-0 top-0 h-[78%] w-[72%] overflow-hidden rounded-2xl shadow-xl animate-scale-in">
                  <img
                    src={heroArtwork.image_url}
                    alt={heroArtwork.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                {artworks[1] && (
                  <div className="absolute bottom-0 left-0 h-[48%] w-[52%] overflow-hidden rounded-2xl border-4 border-paper shadow-lg animate-scale-in [animation-delay:0.15s]">
                    <img
                      src={artworks[1].image_url}
                      alt={artworks[1].title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                {artworks[2] && (
                  <div className="absolute bottom-[18%] right-[6%] h-[28%] w-[30%] overflow-hidden rounded-xl border-4 border-paper shadow-md animate-scale-in [animation-delay:0.3s]">
                    <img
                      src={artworks[2].image_url}
                      alt={artworks[2].title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-dashed border-paper-line bg-paper-warm text-center animate-fade-in">
                <Palette className="h-12 w-12 text-ink-faint" strokeWidth={1} />
                <p className="mt-5 max-w-xs font-serif text-lg text-ink-muted">
                  The gallery is being curated.
                </p>
                <p className="mt-1.5 max-w-xs font-sans text-sm text-ink-faint">
                  As artists join, their work will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Curated Collection */}
      <section className="container-content py-16 lg:py-20">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="label-eyebrow">Curated Collection</p>
            <h2 className="mt-3 font-serif text-4xl font-light tracking-tightish text-ink">
              This week's selected works
            </h2>
          </div>
          <Link
            to="/shop"
            className="hidden items-center gap-1.5 font-sans text-sm font-medium text-ink transition-colors hover:text-clay-600 sm:flex"
          >
            View all
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>

        {loading ? (
          <div className="mt-12">
            <ArtworkGridSkeleton count={8} />
          </div>
        ) : artworks.length === 0 ? (
          <EmptyState
            icon={<ImageIcon className="h-10 w-10" strokeWidth={1} />}
            title="No works yet"
            body="When artists begin listing their pieces, you'll find this week's curated selections here."
          />
        ) : (
          <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
            {artworks.map((artwork, i) => (
              <div
                key={artwork.id}
                className="animate-fade-up"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <ArtworkCard artwork={artwork} priority={i < 4} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Featured Artists */}
      <section className="bg-paper-warm py-16 lg:py-24">
        <div className="container-content">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="label-eyebrow">The Roster</p>
              <h2 className="mt-3 font-serif text-4xl font-light tracking-tightish text-ink">
                Featured artists
              </h2>
              <p className="mt-3 max-w-lg font-sans text-base text-ink-muted">
                Each artist has a dedicated portfolio — explore their full body of
                work, with their most celebrated pieces gathered in a curated
                selection.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="shimmer aspect-[3/4] w-full rounded-2xl" />
              ))}
            </div>
          ) : artists.length === 0 ? (
            <EmptyState
              icon={<Users className="h-10 w-10" strokeWidth={1} />}
              title="No artists yet"
              body="When artists join himabindu.studio, their profiles and portfolios will be featured here."
            />
          ) : (
            <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
              {artists.map((artist, i) => (
                <div
                  key={artist.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <ArtistCard artist={artist} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Value props */}
      <section className="container-content py-16 lg:py-20">
        <div className="grid gap-10 md:grid-cols-3">
          <ValueProp
            title="Original, one-of-a-kind"
            body="Every piece is an original artwork — no prints, no reproductions. What you see is the work the artist made by hand."
          />
          <ValueProp
            title="Direct from the artist"
            body="Buying on himabindu.studio means supporting an independent artist directly. Each work ships from the artist's studio."
          />
          <ValueProp
            title="Artist portfolios"
            body="Visit any artist's page to see their full collection, with a dedicated section for their most celebrated works."
          />
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-serif text-3xl font-light text-ink">{value}</div>
      <div className="mt-1 font-sans text-xs uppercase tracking-wider2 text-ink-muted">
        {label}
      </div>
    </div>
  );
}

function ValueProp({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-serif text-xl text-ink">{title}</h3>
      <p className="mt-3 font-sans text-sm leading-relaxed text-ink-muted">{body}</p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="mt-12 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-paper-line bg-paper-warm px-6 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-paper-deep text-ink-faint">
        {icon}
      </div>
      <p className="font-serif text-2xl text-ink">{title}</p>
      <p className="max-w-md font-sans text-sm leading-relaxed text-ink-muted">{body}</p>
    </div>
  );
}
