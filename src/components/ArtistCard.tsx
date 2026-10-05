import { Link } from '@/components/ui/Link';
import type { Artist } from '@/lib/types';

interface ArtistCardProps {
  artist: Artist;
}

export function ArtistCard({ artist }: ArtistCardProps) {
  return (
    <Link to={`/artist/${artist.slug}`} className="group block">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-paper-deep">
        {artist.portrait_url ? (
          <img
            src={artist.portrait_url}
            alt={artist.name}
            loading="lazy"
            className="h-full w-full object-cover grayscale-[20%] transition-all duration-700 ease-out group-hover:scale-[1.04] group-hover:grayscale-0"
          />
        ) : (
          <div className="h-full w-full bg-paper-deep" />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent p-5 pt-12">
          <h3 className="font-serif text-xl text-paper">{artist.name}</h3>
          <p className="mt-0.5 line-clamp-1 font-sans text-sm text-paper/80">
            {artist.tagline}
          </p>
        </div>
      </div>
    </Link>
  );
}
