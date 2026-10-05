import { useEffect, useRef, useState } from 'react';
import { Link, navigate } from '@/lib/router';
import { fetchPurchase, fetchPurchasesBySessionId, startStripeCartCheckout } from '@/lib/data';
import { formatPrice } from '@/lib/format';
import { cartStore } from '@/lib/cart';
import { getCheckoutQueue, setCheckoutQueue, type QueuedCheckoutGroup } from '@/lib/checkoutQueue';
import type { PurchaseWithDetails } from '@/lib/types';
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';

interface PaymentSuccessPageProps {
  purchaseId?: string;
  sessionId?: string;
}

export function PaymentSuccessPage({ purchaseId, sessionId }: PaymentSuccessPageProps) {
  const [purchases, setPurchases] = useState<PurchaseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [queue, setQueue] = useState<QueuedCheckoutGroup[]>([]);
  const [continuing, setContinuing] = useState(false);
  const [continueError, setContinueError] = useState<string | null>(null);
  const clearedCartRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const poll = setInterval(async () => {
      attempts++;
      const result = sessionId
        ? await fetchPurchasesBySessionId(sessionId)
        : purchaseId
          ? await fetchPurchase(purchaseId).then((p) => (p ? [p] : []))
          : [];

      if (cancelled) return;

      if (result.length === 0) {
        if (attempts >= 10) {
          setNotFound(true);
          setLoading(false);
          clearInterval(poll);
        }
        return;
      }

      setPurchases(result);
      const allPaid = result.every((p) => p.status === 'paid');

      if (allPaid || attempts >= 10) {
        setLoading(false);
        clearInterval(poll);
        if (allPaid && !clearedCartRef.current) {
          clearedCartRef.current = true;
          result.forEach((p) => cartStore.remove(p.artwork_id));
          setQueue(getCheckoutQueue());
        }
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [purchaseId, sessionId]);

  const handleContinue = async () => {
    if (queue.length === 0) return;
    setContinuing(true);
    setContinueError(null);
    const [next, ...rest] = queue;
    const { url, error } = await startStripeCartCheckout(next.artworkIds);
    if (error || !url) {
      setContinueError(error || 'Something went wrong. Please try again.');
      setContinuing(false);
      return;
    }
    setCheckoutQueue(rest);
    window.location.href = url;
  };

  if (notFound) {
    return (
      <div className="container-content flex flex-col items-center justify-center py-24 text-center">
        <p className="font-serif text-3xl text-ink">Order not found</p>
        <Link to="/shop" className="btn-outline mt-6">Back to shop</Link>
      </div>
    );
  }

  const isPaid = purchases.length > 0 && purchases.every((p) => p.status === 'paid');
  const hasMoreToPay = isPaid && queue.length > 0;
  const totalPaidCents = purchases.reduce((sum, p) => sum + p.amount_cents, 0);

  return (
    <div className="container-content flex flex-col items-center justify-center py-24 text-center lg:py-32">
      <div className={`flex h-20 w-20 items-center justify-center rounded-full animate-scale-in ${isPaid ? 'bg-sage-100' : 'bg-paper-deep'}`}>
        {loading ? (
          <Loader2 className="h-10 w-10 text-ink-muted animate-spin" strokeWidth={1.25} />
        ) : isPaid ? (
          <CheckCircle2 className="h-10 w-10 text-sage-600" strokeWidth={1.25} />
        ) : (
          <Loader2 className="h-10 w-10 text-ink-muted animate-spin" strokeWidth={1.25} />
        )}
      </div>

      <p className="label-eyebrow mt-8 animate-fade-up-d1">
        {loading ? 'Confirming your payment' : isPaid ? 'Payment confirmed' : 'Payment processing'}
      </p>
      <h1 className="mt-4 font-serif text-4xl font-light tracking-tightish text-ink animate-fade-up-d2 sm:text-5xl">
        {loading
          ? 'Confirming…'
          : isPaid
            ? (hasMoreToPay ? 'One payment down' : 'Thank you for your purchase')
            : 'Your payment is being processed'}
      </h1>
      <p className="mt-5 max-w-md font-sans text-base leading-relaxed text-ink-muted animate-fade-up-d3">
        {loading
          ? "We're confirming your payment with Stripe. This usually takes a few seconds."
          : isPaid
            ? hasMoreToPay
              ? `That artist has been paid. You still have ${queue.length} more ${queue.length === 1 ? 'artist' : 'artists'} to pay for the rest of your cart.`
              : 'Your payment has been confirmed. The artist will be notified to prepare your artwork for shipping.'
            : "We've received your order and are waiting for payment confirmation. You'll receive an email once it's confirmed."}
      </p>

      {purchases.length > 0 && isPaid && (
        <div className="mt-8 max-w-md w-full rounded-xl border border-paper-line bg-white px-8 py-5 animate-fade-up-d3 text-left">
          <p className="font-sans text-xs uppercase tracking-wider2 text-ink-faint">Order</p>
          <ul className="mt-2 space-y-3">
            {purchases.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-serif text-lg text-ink">{p.artwork.title}</p>
                  <p className="font-sans text-sm text-ink-muted">by {p.artist.name}</p>
                </div>
                <span className="font-sans text-sm font-medium text-ink">{formatPrice(p.amount_cents / 100)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-paper-line pt-4">
            <div className="flex justify-between">
              <span className="font-sans text-sm text-ink-muted">Amount paid</span>
              <span className="font-sans text-sm font-medium text-ink">{formatPrice(totalPaidCents / 100)}</span>
            </div>
          </div>
        </div>
      )}

      {continueError && (
        <p className="mt-4 max-w-md rounded-lg bg-clay-50 px-4 py-3 font-sans text-sm text-clay-600">{continueError}</p>
      )}

      <div className="mt-10 flex flex-col gap-3 sm:flex-row animate-fade-up-d4">
        {hasMoreToPay ? (
          <button onClick={handleContinue} disabled={continuing} className="btn-accent">
            {continuing ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
            ) : (
              <>
                Continue to pay {queue[0].artistName}
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </>
            )}
          </button>
        ) : (
          <>
            <Link to="/shop" className="btn-accent">
              Continue collecting
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
            <button onClick={() => navigate('/dashboard')} className="btn-outline">
              View my orders
            </button>
          </>
        )}
      </div>
    </div>
  );
}
