import { useEffect, useState } from 'react';
import { Link, navigate } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { fetchArtistByUserId, createArtistProfile, updateArtistProfile, uploadArtworkImage } from '@/lib/data';
import type { Artist } from '@/lib/types';
import { ArrowLeft, Upload, Check } from 'lucide-react';

export function ArtistProfileEditPage() {
  const { user, loading, refreshProfile } = useAuth();
  const [existing, setExisting] = useState<Artist | null>(null);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPortrait, setUploadingPortrait] = useState(false);

  const [form, setForm] = useState({
    name: '',
    tagline: '',
    bio: '',
    location: '',
    specialties: '',
    portrait_url: '',
    website: '',
    instagram: '',
    twitter: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }
    if (!user) return;

    fetchArtistByUserId(user.id)
      .then((a) => {
        setExisting(a);
        if (a) {
          setForm({
            name: a.name,
            tagline: a.tagline || '',
            bio: a.bio || '',
            location: a.location || '',
            specialties: a.specialties.join(', '),
            portrait_url: a.portrait_url || '',
            website: a.website || '',
            instagram: a.instagram || '',
            twitter: a.twitter || '',
          });
        }
      })
      .finally(() => setChecking(false));
  }, [user, loading]);

  if (loading || checking) {
    return <div className="container-content py-16"><div className="shimmer h-12 w-64 rounded" /></div>;
  }

  if (!user) return null;

  const update = (field: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handlePortraitUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingPortrait(true);
    const { url, error } = await uploadArtworkImage(file, user.id);
    setUploadingPortrait(false);
    if (error) { setError(error); return; }
    if (url) update('portrait_url', url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const specialties = form.specialties.split(',').map((s) => s.trim()).filter(Boolean);

    if (existing) {
      const { error } = await updateArtistProfile(existing.id, {
        name: form.name,
        tagline: form.tagline,
        bio: form.bio,
        location: form.location,
        specialties,
        portrait_url: form.portrait_url,
        website: form.website,
        instagram: form.instagram,
        twitter: form.twitter,
      });
      if (error) { setError(error); setSaving(false); return; }
      navigate('/artist-dashboard');
    } else {
      if (!user) return;
      const { error } = await createArtistProfile(user.id, {
        name: form.name,
        tagline: form.tagline,
        bio: form.bio,
        location: form.location,
        specialties,
        portrait_url: form.portrait_url,
        website: form.website,
        instagram: form.instagram,
        twitter: form.twitter,
      });
      if (error) { setError(error); setSaving(false); return; }
      // createArtistProfile sets profiles.role to 'artist' server-side (via the
      // set_user_role RPC) — refresh the cached profile so the header nav and
      // dashboard link immediately reflect the new role.
      await refreshProfile();
      navigate('/artist-dashboard');
    }
  };

  return (
    <div className="container-content py-10 lg:py-14">
      <Link to="/artist-dashboard" className="label-eyebrow mb-6 inline-flex items-center gap-1.5 transition-colors hover:text-clay-500">
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Back to dashboard
      </Link>

      <h1 className="font-serif text-4xl font-light tracking-tightish text-ink animate-fade-up">
        {existing ? 'Edit artist profile' : 'Create artist profile'}
      </h1>

      <form onSubmit={handleSubmit} className="mt-10 max-w-2xl space-y-6 animate-fade-up-d1">
        {/* Portrait */}
        <div>
          <label className="label-eyebrow block">Profile picture</label>
          <div className="mt-2 flex items-center gap-4">
            {form.portrait_url && (
              <img src={form.portrait_url} alt="Portrait" className="h-20 w-20 rounded-full object-cover" />
            )}
            <label className="btn-outline cursor-pointer">
              <Upload className="h-4 w-4" strokeWidth={1.5} />
              {uploadingPortrait ? 'Uploading…' : 'Upload photo'}
              <input type="file" accept="image/*" onChange={handlePortraitUpload} className="hidden" />
            </label>
          </div>
        </div>

        <Field label="Display name" value={form.name} onChange={(v) => update('name', v)} required />
        <Field label="Tagline" value={form.tagline} onChange={(v) => update('tagline', v)} placeholder="A short one-line descriptor" />
        <div>
          <label className="label-eyebrow block">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => update('bio', e.target.value)}
            rows={5}
            className="field mt-2 resize-none"
            placeholder="Tell collectors about your practice and background…"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location" value={form.location} onChange={(v) => update('location', v)} placeholder="City, Country" />
          <Field label="Specialties" value={form.specialties} onChange={(v) => update('specialties', v)} placeholder="Oil, Abstract, Landscape" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Website" value={form.website} onChange={(v) => update('website', v)} placeholder="yoursite.com" />
          <Field label="Instagram" value={form.instagram} onChange={(v) => update('instagram', v)} placeholder="@handle" />
          <Field label="Twitter/X" value={form.twitter} onChange={(v) => update('twitter', v)} placeholder="@handle" />
        </div>

        {error && <p className="rounded-lg bg-clay-50 px-4 py-3 font-sans text-sm text-clay-600">{error}</p>}

        <button type="submit" disabled={saving} className="btn-accent">
          {saving ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <>
              <Check className="h-5 w-5" strokeWidth={1.5} />
              {existing ? 'Save changes' : 'Create profile'}
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, error, placeholder, required, type = 'text' }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="label-eyebrow block">{label}{required && <span className="text-clay-500"> *</span>}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={`field mt-2 ${error ? 'border-clay-400' : ''}`}
      />
      {error && <p className="mt-1.5 font-sans text-xs text-clay-500">{error}</p>}
    </div>
  );
}
