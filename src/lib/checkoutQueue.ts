// A cart can hold artwork from several artists, but a single Stripe Checkout
// Session can only pay out to one connected artist account. So a multi-artist
// cart checks out as a short sequence of Stripe sessions, one per artist. This
// module tracks "what's left to pay" in sessionStorage so the flow survives
// the full-page redirect to Stripe and back.

const QUEUE_KEY = 'himabindu_checkout_queue_v1';

export interface QueuedCheckoutGroup {
  artistName: string;
  artworkIds: string[];
}

export function getCheckoutQueue(): QueuedCheckoutGroup[] {
  try {
    const raw = sessionStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedCheckoutGroup[]) : [];
  } catch {
    return [];
  }
}

export function setCheckoutQueue(groups: QueuedCheckoutGroup[]) {
  try {
    if (groups.length === 0) {
      sessionStorage.removeItem(QUEUE_KEY);
    } else {
      sessionStorage.setItem(QUEUE_KEY, JSON.stringify(groups));
    }
  } catch {
    // ignore quota / private-mode errors — worst case the buyer re-checks-out manually
  }
}

export function clearCheckoutQueue() {
  try {
    sessionStorage.removeItem(QUEUE_KEY);
  } catch {
    // ignore
  }
}
