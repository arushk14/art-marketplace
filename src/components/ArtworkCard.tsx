import { Link } from '@/components/ui/Link';
import { formatPrice } from '@/lib/format';
import type { ArtworkWithArtist } from '@/lib/types';

interface ArtworkCardProps {
  artwork: ArtworkWithArtist;
  priority?: boolean;
}

export function ArtworkCard({ artwork, priority = false }: ArtworkCardProps) {
  const sold = artwork.status === 'sold';
  const pending = artwork.status === 'pending';
  const unavailable = sold || pending;

  return (
    <Link to={`/artwork/${artwork.slug}`} className="group block">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-paper-deep">
        <img
          src={artwork.image_url}
          alt={artwork.title}
          loading={priority ? 'eager' : 'lazy'}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        {unavailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/55 backdrop-blur-[2px]">
            <span className="label-eyebrow rounded-full bg-paper px-5 py-2 text-ink">
              {sold ? 'Sold' : 'Sale pending'}
            </span>
          </div>
        )}
        {!unavailable && (
          <div className="absolute inset-0 bg-ink/0 transition-colors duration-500 group-hover:bg-ink/5" />
        )}
      </div>
      <div className="mt-4 px-1">
        <h3 className="font-serif text-lg leading-snug text-ink transition-colors group-hover:text-clay-600">
          {artwork.title}
        </h3>
        <p className="mt-1 font-sans text-sm text-ink-muted">
          {artwork.artist.name}
        </p>
        <p className="mt-2 font-sans text-sm font-medium text-ink">
          {formatPrice(artwork.price)}
        </p>
      </div>
    </Link>
  );
}
