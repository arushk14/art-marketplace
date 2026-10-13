import { useEffect, useState } from 'react';
import { ArtistCard } from '@/components/ArtistCard';
import { fetchAllArtists } from '@/lib/data';
import type { Artist } from '@/lib/types';
import { Users } from 'lucide-react';

export function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchAllArtists()
      .then((data) => {
        if (!active) return;
        setArtists(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load artists', err);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="container-content py-12 lg:py-16">
      <div className="border-b border-paper-line pb-8">
        <p className="label-eyebrow animate-fade-up">The Roster</p>
        <h1 className="mt-4 font-serif text-5xl font-light tracking-tightish text-ink animate-fade-up-d1">
          Our artists
        </h1>
        <p className="mt-4 max-w-xl font-sans text-base text-ink-muted animate-fade-up-d2">
          Independent artists from around the world. Each has a dedicated portfolio
          page with their full body of work and a curated selection of their finest
          pieces.
        </p>
      </div>

      {loading ? (
        <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shimmer aspect-[3/4] w-full rounded-2xl" />
          ))}
        </div>
      ) : artists.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-paper-line bg-paper-warm px-6 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-paper-deep text-ink-faint">
            <Users className="h-10 w-10" strokeWidth={1} />
          </div>
          <p className="font-serif text-2xl text-ink">No artists yet</p>
          <p className="max-w-md font-sans text-sm leading-relaxed text-ink-muted">
            When artists join artzillow.studio, their profiles and portfolios will
            appear here. Each artist gets a dedicated page to showcase their full
            body of work.
          </p>
        </div>
      ) : (
        <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
          {artists.map((artist, i) => (
            <div
              key={artist.id}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <ArtistCard artist={artist} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
