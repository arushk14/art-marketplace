import { useEffect } from 'react';
import { Link } from '@/lib/router';
import { clearCheckoutQueue } from '@/lib/checkoutQueue';
import { XCircle, ArrowLeft } from 'lucide-react';

export function PaymentCancelledPage({ artworkId }: { artworkId: string }) {
  // If this was one step of a multi-artist cart checkout, cancelling abandons
  // the whole sequence rather than silently prompting to pay the remaining
  // artists later — the buyer can restart from the cart if they want to retry.
  useEffect(() => {
    clearCheckoutQueue();
  }, []);

  return (
    <div className="container-content flex flex-col items-center justify-center py-24 text-center lg:py-32">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-clay-50 animate-scale-in">
        <XCircle className="h-10 w-10 text-clay-500" strokeWidth={1.25} />
      </div>

      <p className="label-eyebrow mt-8 animate-fade-up-d1">Payment cancelled</p>
      <h1 className="mt-4 font-serif text-4xl font-light tracking-tightish text-ink animate-fade-up-d2 sm:text-5xl">
        Your payment was cancelled
      </h1>
      <p className="mt-5 max-w-md font-sans text-base leading-relaxed text-ink-muted animate-fade-up-d3">
        No charge has been made. The artwork is still available — you can try again whenever you're ready.
      </p>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row animate-fade-up-d4">
        <Link to={`/artwork/${artworkId}`} className="btn-accent">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Back to artwork
        </Link>
        <Link to="/shop" className="btn-outline">
          Browse the collection
        </Link>
      </div>
    </div>
  );
}
