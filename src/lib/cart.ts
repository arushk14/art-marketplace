import { useSyncExternalStore } from 'react';
import type { CartItem } from '@/lib/types';

const STORAGE_KEY = 'himabindu_cart_v1';
const EVENT = 'himabindu:cart-change';

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore quota / private-mode errors
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

function subscribe(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export const cartStore = {
  getItems(): CartItem[] {
    return read();
  },
  add(item: CartItem) {
    const items = read();
    if (items.some((i) => i.artworkId === item.artworkId)) return;
    write([...items, item]);
  },
  remove(artworkId: string) {
    write(read().filter((i) => i.artworkId !== artworkId));
  },
  clear() {
    write([]);
  },
  has(artworkId: string): boolean {
    return read().some((i) => i.artworkId === artworkId);
  },
  count(): number {
    return read().length;
  },
  subtotal(): number {
    return read().reduce((sum, i) => sum + i.price, 0);
  },
};

let cachedRaw: string | null = null;
let cachedItems: CartItem[] = [];

function getSnapshot(): CartItem[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedItems;
  cachedRaw = raw;
  cachedItems = read();
  return cachedItems;
}

export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useCartCount(): number {
  const items = useCart();
  return items.length;
}
