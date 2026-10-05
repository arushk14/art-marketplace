import { useState } from 'react';
import { Link, navigate } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react';

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await signIn(email, password);
    if (error) {
      setError(error);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="container-content flex items-center justify-center py-16 lg:py-24">
      <div className="w-full max-w-md animate-fade-up">
        <Link to="/" className="label-eyebrow mb-8 inline-flex items-center gap-1.5 transition-colors hover:text-clay-500">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Back home
        </Link>

        <h1 className="font-serif text-4xl font-light tracking-tightish text-ink">Welcome back</h1>
        <p className="mt-3 font-sans text-sm text-ink-muted">Sign in to manage your collection, orders, and wishlist.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="label-eyebrow block">Email</label>
            <div className="relative mt-2">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" strokeWidth={1.5} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field pl-10"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="label-eyebrow block">Password</label>
            <div className="relative mt-2">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" strokeWidth={1.5} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field pl-10"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-clay-50 px-4 py-3 font-sans text-sm text-clay-600">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-accent w-full">
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <>
                Sign in
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 font-sans text-sm text-ink-muted">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-clay-500 transition-colors hover:text-clay-600">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
