import { useState } from 'react';
import { Link, navigate } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { Mail, Lock, User, ArrowRight, ArrowLeft, Palette, ShoppingBag } from 'lucide-react';

export function SignupPage() {
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'buyer' | 'artist'>('buyer');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await signUp(email, password, displayName, role);
    if (error) {
      setError(error);
      setLoading(false);
    } else {
      navigate(role === 'artist' ? '/artist-profile-edit' : '/dashboard');
    }
  };

  return (
    <div className="container-content flex items-center justify-center py-16 lg:py-24">
      <div className="w-full max-w-md animate-fade-up">
        <Link to="/" className="label-eyebrow mb-8 inline-flex items-center gap-1.5 transition-colors hover:text-clay-500">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          Back home
        </Link>

        <h1 className="font-serif text-4xl font-light tracking-tightish text-ink">Create your account</h1>
        <p className="mt-3 font-sans text-sm text-ink-muted">Join the marketplace to collect art or sell your work.</p>

        {/* Role selector */}
        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole('buyer')}
            className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
              role === 'buyer'
                ? 'border-clay-400 bg-clay-50 text-ink'
                : 'border-paper-line bg-white text-ink-muted hover:border-ink/20'
            }`}
          >
            <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
            <span className="font-sans text-sm font-medium">I'm a buyer</span>
            <span className="font-sans text-xs text-ink-faint">Collect art</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('artist')}
            className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
              role === 'artist'
                ? 'border-clay-400 bg-clay-50 text-ink'
                : 'border-paper-line bg-white text-ink-muted hover:border-ink/20'
            }`}
          >
            <Palette className="h-5 w-5" strokeWidth={1.5} />
            <span className="font-sans text-sm font-medium">I'm an artist</span>
            <span className="font-sans text-xs text-ink-faint">Sell your work</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="label-eyebrow block">Display name</label>
            <div className="relative mt-2">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" strokeWidth={1.5} />
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="field pl-10"
                placeholder="Your name"
              />
            </div>
          </div>

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
                placeholder="At least 6 characters"
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
                Create account
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 font-sans text-sm text-ink-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-clay-500 transition-colors hover:text-clay-600">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
