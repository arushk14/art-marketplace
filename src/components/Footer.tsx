import { Link } from '@/lib/router';
import { Instagram, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-paper-line bg-paper-warm">
      <div className="container-content py-16">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          {/* Brand */}
          <div className="max-w-sm">
            <Link to="/" className="flex items-baseline">
              <span className="font-serif text-2xl font-medium tracking-tightish text-ink">
                artzillow
              </span>
              <span className="font-serif text-2xl font-light text-clay-500">.studio</span>
            </Link>
            <p className="mt-4 font-sans text-sm leading-relaxed text-ink-muted">
              An online marketplace for original art. Discover one-of-a-kind pieces
              from independent artists around the world and collect work that speaks
              to you.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-ink-muted transition-colors hover:text-clay-500"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" strokeWidth={1.5} />
              </a>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-ink-muted transition-colors hover:text-clay-500"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" strokeWidth={1.5} />
              </a>
            </div>
          </div>

          {/* Explore */}
          <div>
            <h3 className="label-eyebrow mb-4">Explore</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/shop" className="font-sans text-sm text-ink-muted hover:text-ink">
                  Shop All Art
                </Link>
              </li>
              <li>
                <Link to="/artists" className="font-sans text-sm text-ink-muted hover:text-ink">
                  Artists
                </Link>
              </li>
              <li>
                <Link to="/shop" className="font-sans text-sm text-ink-muted hover:text-ink">
                  Paintings
                </Link>
              </li>
              <li>
                <Link to="/shop" className="font-sans text-sm text-ink-muted hover:text-ink">
                  Photography
                </Link>
              </li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="label-eyebrow mb-4">Studio</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="font-sans text-sm text-ink-muted hover:text-ink">
                  Our Story
                </Link>
              </li>
              <li>
                <Link to="/" className="font-sans text-sm text-ink-muted hover:text-ink">
                  Collecting Guide
                </Link>
              </li>
              <li>
                <Link to="/" className="font-sans text-sm text-ink-muted hover:text-ink">
                  Shipping & Returns
                </Link>
              </li>
              <li>
                <Link to="/" className="font-sans text-sm text-ink-muted hover:text-ink">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-paper-line pt-8 sm:flex-row sm:items-center">
          <p className="font-sans text-xs text-ink-faint">
            © {new Date().getFullYear()} artzillow.studio. All artworks belong to their respective artists.
          </p>
          <p className="font-sans text-xs text-ink-faint">
            Crafted with care for collectors of original art.
          </p>
        </div>
      </div>
    </footer>
  );
}
