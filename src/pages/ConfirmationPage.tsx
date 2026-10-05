import { Link } from '@/lib/router';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export function ConfirmationPage() {
  const orderNumber = `HMB-${Math.floor(100000 + Math.random() * 900000)}`;

  return (
    <div className="container-content flex flex-col items-center justify-center py-24 text-center lg:py-32">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sage-100 animate-scale-in">
        <CheckCircle2 className="h-10 w-10 text-sage-600" strokeWidth={1.25} />
      </div>

      <p className="label-eyebrow mt-8 animate-fade-up-d1">Order confirmed</p>
      <h1 className="mt-4 font-serif text-4xl font-light tracking-tightish text-ink animate-fade-up-d2 sm:text-5xl">
        Thank you for your purchase
      </h1>
      <p className="mt-5 max-w-md font-sans text-base leading-relaxed text-ink-muted animate-fade-up-d3">
        Your order has been placed. A confirmation has been sent to your email,
        and the artist will be notified to prepare your artwork for shipping.
      </p>

      <div className="mt-8 rounded-xl border border-paper-line bg-white px-8 py-5 animate-fade-up-d3">
        <p className="font-sans text-xs uppercase tracking-wider2 text-ink-faint">
          Order number
        </p>
        <p className="mt-1 font-serif text-2xl text-ink">{orderNumber}</p>
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row animate-fade-up-d4">
        <Link to="/shop" className="btn-accent">
          Continue collecting
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Link>
        <Link to="/" className="btn-outline">
          Back to home
        </Link>
      </div>
    </div>
  );
}
