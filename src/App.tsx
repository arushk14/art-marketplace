import { useState } from 'react';
import { useRoute } from '@/lib/router';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { HomePage } from '@/pages/HomePage';
import { ShopPage } from '@/pages/ShopPage';
import { ArtistsPage } from '@/pages/ArtistsPage';
import { ArtworkDetailPage } from '@/pages/ArtworkDetailPage';
import { ArtistPage } from '@/pages/ArtistPage';
import { CartPage } from '@/pages/CartPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { ConfirmationPage } from '@/pages/ConfirmationPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { BuyerDashboardPage } from '@/pages/BuyerDashboardPage';
import { ArtistDashboardPage } from '@/pages/ArtistDashboardPage';
import { ArtistProfileEditPage } from '@/pages/ArtistProfileEditPage';
import { ArtworkUploadPage } from '@/pages/ArtworkUploadPage';
import { PaymentSuccessPage } from '@/pages/PaymentSuccessPage';
import { PaymentCancelledPage } from '@/pages/PaymentCancelledPage';
import { Link } from '@/lib/router';

function NotFoundPage() {
  return (
    <div className="container-content flex flex-col items-center justify-center gap-5 py-32 text-center">
      <p className="font-serif text-7xl font-light text-clay-500">404</p>
      <p className="font-serif text-2xl text-ink">Page not found</p>
      <Link to="/" className="btn-outline">
        Back to home
      </Link>
    </div>
  );
}

export default function App() {
  const route = useRoute();
  const [cartOpen, setCartOpen] = useState(false);

  let page: React.ReactNode;
  switch (route.name) {
    case 'home':
      page = <HomePage />;
      break;
    case 'shop':
      page = <ShopPage />;
      break;
    case 'artists':
      page = <ArtistsPage />;
      break;
    case 'artwork':
      page = <ArtworkDetailPage slug={route.slug} onOpenCart={() => setCartOpen(true)} />;
      break;
    case 'artist':
      page = <ArtistPage slug={route.slug} />;
      break;
    case 'cart':
      page = <CartPage />;
      break;
    case 'checkout':
      page = <CheckoutPage />;
      break;
    case 'confirmation':
      page = <ConfirmationPage />;
      break;
    case 'login':
      page = <LoginPage />;
      break;
    case 'signup':
      page = <SignupPage />;
      break;
    case 'dashboard':
      page = <BuyerDashboardPage />;
      break;
    case 'artist-dashboard':
      page = <ArtistDashboardPage />;
      break;
    case 'artist-profile-edit':
      page = <ArtistProfileEditPage />;
      break;
    case 'artist-upload':
      page = <ArtworkUploadPage />;
      break;
    case 'artist-edit-artwork':
      page = <ArtworkUploadPage editSlug={route.slug} />;
      break;
    case 'payment-success':
      page = <PaymentSuccessPage purchaseId={route.purchaseId} sessionId={route.sessionId} />;
      break;
    case 'payment-cancelled':
      page = <PaymentCancelledPage artworkId={route.artworkId} />;
      break;
    default:
      page = <NotFoundPage />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header onOpenCart={() => setCartOpen(true)} />
      <main className="flex-1">{page}</main>
      <Footer />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
