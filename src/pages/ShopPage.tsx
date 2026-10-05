import { useEffect, useState } from 'react';
import { ArtworkCard } from '@/components/ArtworkCard';
import { ArtworkGridSkeleton } from '@/components/ui/Skeleton';
import { Search, SlidersHorizontal, Check, Image as ImageIcon } from 'lucide-react';
import {
  fetchArtworks,
  CATEGORIES,
} from '@/lib/data';
import type { ArtCategory, ArtworkWithArtist } from '@/lib/types';

type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'title';

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
  title: 'A–Z',
};

const PAGE_SIZE = 24;

export function ShopPage() {
  const [artworks, setArtworks] = useState<ArtworkWithArtist[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<ArtCategory | null>(null);
  const [sort, setSort] = useState<SortOption>('newest');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchArtworks({ category, sort, search, offset: 0, limit: PAGE_SIZE })
      .then((page) => {
        if (!active) return;
        setArtworks(page.items);
        setTotal(page.total);
        setHasMore(page.hasMore);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load artworks', err);
        if (!active) return;
        setError("We couldn't load the collection. Please try again.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [category, sort, search]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    fetchArtworks({ category, sort, search, offset: artworks.length, limit: PAGE_SIZE })
      .then((page) => {
        setArtworks((prev) => [...prev, ...page.items]);
        setTotal(page.total);
        setHasMore(page.hasMore);
      })
      .catch((err) => {
        console.error('Failed to load more artworks', err);
      })
      .finally(() => setLoadingMore(false));
  };

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  return (
    <div className="container-content py-12 lg:py-16">
      {/* Heading */}
      <div className="border-b border-paper-line pb-8">
        <p className="label-eyebrow animate-fade-up">The Collection</p>
        <h1 className="mt-4 font-serif text-5xl font-light tracking-tightish text-ink animate-fade-up-d1">
          Shop original art
        </h1>
        <p className="mt-4 max-w-xl font-sans text-base text-ink-muted animate-fade-up-d2">
          Browse paintings, watercolors, photography, and sculpture from
          independent artists. Each piece is one of a kind.
        </p>
      </div>

      {/* Toolbar */}
      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Category pills */}
        <div className="flex flex-wrap items-center gap-2">
          <CategoryPill
            active={category === null}
            onClick={() => setCategory(null)}
            label="All"
          />
          {CATEGORIES.map((cat) => (
            <CategoryPill
              key={cat}
              active={category === cat}
              onClick={() => setCategory(cat)}
              label={cat}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 lg:w-56">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
              strokeWidth={1.5}
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title"
              className="field pl-10"
              aria-label="Search artworks"
            />
          </div>

          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setSortOpen((v) => !v)}
              onBlur={() => setTimeout(() => setSortOpen(false), 150)}
              className="btn-outline px-4 py-3"
              aria-label="Sort"
              aria-expanded={sortOpen}
            >
              <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />
              <span className="hidden sm:inline">{SORT_LABELS[sort]}</span>
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-paper-line bg-white py-2 shadow-xl animate-scale-in">
                {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setSort(opt);
                      setSortOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-4 py-2.5 font-sans text-sm text-ink-soft transition-colors hover:bg-paper-warm"
                  >
                    {SORT_LABELS[opt]}
                    {sort === opt && <Check className="h-4 w-4 text-clay-500" strokeWidth={2} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mt-4 mb-8">
        <p className="font-sans text-sm text-ink-muted">
          {loading
            ? 'Loading…'
            : `${total} ${total === 1 ? 'piece' : 'pieces'}`}
        </p>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <p className="font-serif text-xl text-ink">{error}</p>
          <button onClick={() => setSort('newest')} className="btn-outline">
            Retry
          </button>
        </div>
      ) : loading ? (
        <ArtworkGridSkeleton count={8} />
      ) : artworks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-paper-warm text-ink-faint">
            <ImageIcon className="h-10 w-10" strokeWidth={1} />
          </div>
          <p className="font-serif text-2xl text-ink">
            {category || search ? 'No pieces found' : 'No art available yet'}
          </p>
          <p className="max-w-md font-sans text-sm text-ink-muted">
            {category || search
              ? 'Try a different category or search term.'
              : 'When artists begin listing their work, original pieces will appear here for you to browse and collect.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
            {artworks.map((artwork, i) => (
              <div
                key={artwork.id}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}
              >
                <ArtworkCard artwork={artwork} priority={i < 4} />
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="mt-12 flex justify-center">
              <button onClick={handleLoadMore} disabled={loadingMore} className="btn-outline">
                {loadingMore ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/20 border-t-ink" />
                ) : (
                  'Load more'
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CategoryPill({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 font-sans text-sm font-medium transition-all duration-300 ${
        active
          ? 'bg-ink text-paper'
          : 'border border-paper-line bg-white text-ink-muted hover:border-ink/40 hover:text-ink'
      }`}
    >
      {label}
      {typeof count === 'number' && count > 0 && (
        <span className={`ml-1.5 text-xs ${active ? 'text-paper/60' : 'text-ink-faint'}`}>
          {count}
        </span>
      )}
    </button>
  );
}
