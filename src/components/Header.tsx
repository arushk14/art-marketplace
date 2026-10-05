import { useEffect, useState } from 'react';
import { Link, navigate, useRoute } from '@/lib/router';
import { useCartCount } from '@/lib/cart';
import { useAuth } from '@/lib/auth';
import { ShoppingBag, Menu, X, User, LogOut, LayoutDashboard, Palette } from 'lucide-react';

interface HeaderProps {
  onOpenCart: () => void;
}

const NAV_LINKS = [
  { label: 'Shop', to: '/shop' },
  { label: 'Artists', to: '/artists' },
];

export function Header({ onOpenCart }: HeaderProps) {
  const route = useRoute();
  const count = useCartCount();
  const { user, profile, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [route]);

  const isActive = (to: string) =>
    route.name === 'shop' && to === '/shop';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const dashboardLink = profile?.role === 'artist' ? '/artist-dashboard' : '/dashboard';

  return (
    <header
      className={`sticky top-0 z-30 transition-all duration-500 ${
        scrolled
          ? 'border-b border-paper-line bg-paper/90 backdrop-blur-md'
          : 'border-b border-transparent bg-paper'
      }`}
    >
      <div className="container-content flex items-center justify-between py-5">
        {/* Logo */}
        <Link to="/" className="flex items-baseline gap-0" ariaLabel="himabindu.studio home">
          <span className="font-serif text-2xl font-medium tracking-tightish text-ink">
            himabindu
          </span>
          <span className="font-serif text-2xl font-light text-clay-500">.studio</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-10 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`font-sans text-sm font-medium transition-colors ${
                isActive(link.to)
                  ? 'text-ink'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCart}
            className="relative rounded-full p-2.5 text-ink transition-colors hover:bg-paper-deep"
            aria-label={`Cart, ${count} items`}
          >
            <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-clay-500 px-1 font-sans text-[10px] font-semibold text-white">
                {count}
              </span>
            )}
          </button>

          {user ? (
            <div className="relative hidden md:block">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full p-1.5 text-ink transition-colors hover:bg-paper-deep"
                aria-label="Account menu"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-clay-100 font-sans text-xs font-medium text-clay-600">
                    {(profile?.display_name || user.email || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-paper-line bg-white py-2 shadow-lg animate-fade-up">
                  <div className="px-4 pb-2 pt-1">
                    <p className="font-sans text-sm font-medium text-ink truncate">{profile?.display_name || 'Account'}</p>
                    <p className="font-sans text-xs text-ink-faint truncate">{user.email}</p>
                  </div>
                  <div className="border-t border-paper-line" />
                  <Link to={dashboardLink} className="flex items-center gap-2.5 px-4 py-2.5 font-sans text-sm text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink">
                    <LayoutDashboard className="h-4 w-4" strokeWidth={1.5} />
                    Dashboard
                  </Link>
                  {profile?.role === 'artist' && (
                    <Link to="/artist-upload" className="flex items-center gap-2.5 px-4 py-2.5 font-sans text-sm text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink">
                      <Palette className="h-4 w-4" strokeWidth={1.5} />
                      Upload artwork
                    </Link>
                  )}
                  <div className="border-t border-paper-line" />
                  <button onClick={handleSignOut} className="flex w-full items-center gap-2.5 px-4 py-2.5 font-sans text-sm text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink">
                    <LogOut className="h-4 w-4" strokeWidth={1.5} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="hidden rounded-full p-2.5 text-ink transition-colors hover:bg-paper-deep md:block">
              <User className="h-5 w-5" strokeWidth={1.5} />
            </Link>
          )}

          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-full p-2.5 text-ink transition-colors hover:bg-paper-deep md:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" strokeWidth={1.5} />
            ) : (
              <Menu className="h-5 w-5" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-paper-line bg-paper md:hidden">
          <nav className="container-content flex flex-col py-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="py-3 font-serif text-lg text-ink"
              >
                {link.label}
              </Link>
            ))}
            <div className="my-2 border-t border-paper-line" />
            {user ? (
              <>
                <Link to={dashboardLink} className="flex items-center gap-2.5 py-3 font-sans text-base text-ink-soft">
                  <LayoutDashboard className="h-4 w-4" strokeWidth={1.5} />
                  Dashboard
                </Link>
                {profile?.role === 'artist' && (
                  <Link to="/artist-upload" className="flex items-center gap-2.5 py-3 font-sans text-base text-ink-soft">
                    <Palette className="h-4 w-4" strokeWidth={1.5} />
                    Upload artwork
                  </Link>
                )}
                <button onClick={handleSignOut} className="flex items-center gap-2.5 py-3 font-sans text-base text-ink-soft">
                  <LogOut className="h-4 w-4" strokeWidth={1.5} />
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/login" className="flex items-center gap-2.5 py-3 font-sans text-base text-ink-soft">
                <User className="h-4 w-4" strokeWidth={1.5} />
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
