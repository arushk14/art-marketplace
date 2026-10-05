import { useSyncExternalStore } from 'react';

export { Link } from '@/components/ui/Link';

export type Route =
  | { name: 'home' }
  | { name: 'shop' }
  | { name: 'artists' }
  | { name: 'artwork'; slug: string }
  | { name: 'artist'; slug: string }
  | { name: 'cart' }
  | { name: 'checkout' }
  | { name: 'confirmation' }
  | { name: 'login' }
  | { name: 'signup' }
  | { name: 'dashboard' }
  | { name: 'artist-dashboard' }
  | { name: 'artist-edit-artwork'; slug: string }
  | { name: 'artist-upload' }
  | { name: 'artist-profile-edit' }
  | { name: 'payment-success'; purchaseId?: string; sessionId?: string }
  | { name: 'payment-cancelled'; artworkId: string }
  | { name: 'not-found' };

export function parseHash(hash: string): Route {
  const clean = hash.replace(/^#/, '').replace(/^\//, '');
  const [pathPart, queryPart] = clean.split('?');
  const parts = pathPart.split('/').filter(Boolean);
  const params = new URLSearchParams(queryPart || '');

  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'shop') return { name: 'shop' };
  if (parts[0] === 'artists') return { name: 'artists' };
  if (parts[0] === 'cart') return { name: 'cart' };
  if (parts[0] === 'checkout') return { name: 'checkout' };
  if (parts[0] === 'confirmation') return { name: 'confirmation' };
  if (parts[0] === 'login') return { name: 'login' };
  if (parts[0] === 'signup') return { name: 'signup' };
  if (parts[0] === 'dashboard') return { name: 'dashboard' };
  if (parts[0] === 'artist-dashboard') return { name: 'artist-dashboard' };
  if (parts[0] === 'artist-upload') return { name: 'artist-upload' };
  if (parts[0] === 'artist-profile-edit') return { name: 'artist-profile-edit' };
  if (parts[0] === 'payment-success') {
    const purchaseId = params.get('purchase') || parts[1];
    const sessionId = params.get('session') || undefined;
    if (purchaseId || sessionId) return { name: 'payment-success', purchaseId: purchaseId || undefined, sessionId };
  }
  if (parts[0] === 'payment-cancelled') {
    const artworkId = params.get('artwork') || parts[1];
    if (artworkId) return { name: 'payment-cancelled', artworkId };
  }
  if (parts[0] === 'artwork' && parts[1]) return { name: 'artwork', slug: parts[1] };
  if (parts[0] === 'artist' && parts[1]) {
    if (parts[2] === 'edit' && parts[3]) return { name: 'artist-edit-artwork', slug: parts[3] };
    return { name: 'artist', slug: parts[1] };
  }

  return { name: 'not-found' };
}

let cachedHash: string | undefined;
let cachedRoute: Route = { name: 'home' };

function getSnapshot(): Route {
  const hash = window.location.hash;
  if (hash === cachedHash) return cachedRoute;
  cachedHash = hash;
  cachedRoute = parseHash(hash);
  return cachedRoute;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function navigate(path: string) {
  const target = path.startsWith('#') ? path : `#${path}`;
  if (window.location.hash === target) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  window.location.hash = target;
  window.scrollTo({ top: 0, behavior: 'auto' });
}

export function href(path: string): string {
  return path.startsWith('#') ? path : `#${path}`;
}
