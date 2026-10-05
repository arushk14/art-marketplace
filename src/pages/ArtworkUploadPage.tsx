import { useEffect, useState } from 'react';
import { Link, navigate } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import {
  fetchArtistByUserId,
  fetchArtworkBySlug,
  fetchArtworkImages,
  createArtwork,
  updateArtwork,
  uploadArtworkImage,
  CATEGORIES,
} from '@/lib/data';
import type { ArtCategory } from '@/lib/types';
import { ArrowLeft, Upload, X, Check, Plus } from 'lucide-react';

interface ArtworkUploadPageProps {
  editSlug?: string;
}

export function ArtworkUploadPage({ editSlug }: ArtworkUploadPageProps) {
  const { user, loading } = useAuth();
  const [artistId, setArtistId] = useState<string | null>(null);
  const [artworkId, setArtworkId] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraImages, setExtraImages] = useState<string[]>([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    medium: '',
    category: 'Painting' as ArtCategory,
    year: '',
    width_cm: '',
    height_cm: '',
    image_url: '',
    style: '',
    shipping_info: '',
    featured: false,
    curated: false,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }
    if (!user) return;

    fetchArtistByUserId(user.id).then(async (artist) => {
      if (!artist) {
        navigate('/artist-profile-edit');
        return;
      }
      setArtistId(artist.id);

      if (editSlug) {
        const artwork = await fetchArtworkBySlug(editSlug);
        if (artwork) {
          setArtworkId(artwork.id);
          setForm({
            title: artwork.title,
            description: artwork.description || '',
            price: String(artwork.price),
            medium: artwork.medium || '',
            category: artwork.category,
            year: artwork.year?.toString() || '',
            width_cm: artwork.width_cm?.toString() || '',
            height_cm: artwork.height_cm?.toString() || '',
            image_url: artwork.image_url,
            style: artwork.style || '',
            shipping_info: artwork.shipping_info || '',
            featured: artwork.featured,
            curated: artwork.curated,
          });
          const images = await fetchArtworkImages(artwork.id);
          setExtraImages(images.map((img) => img.image_url));
        }
      }
      setPreparing(false);
    });
  }, [user, loading, editSlug]);

  if (loading || preparing) {
    return <div className="container-content py-16"><div className="shimmer h-12 w-64 rounded" /></div>;
  }

  if (!user || !artistId) return null;

  const update = (field: keyof typeof form, value: string | boolean) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isPrimary: boolean) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingImage(true);
    const { url, error } = await uploadArtworkImage(file, user.id);
    setUploadingImage(false);
    if (error) { setError(error); return; }
    if (url) {
      if (isPrimary) {
        update('image_url', url);
      } else {
        setExtraImages((prev) => [...prev, url]);
      }
    }
  };

  const removeExtraImage = (idx: number) => {
    setExtraImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!form.image_url) {
      setError('Please upload a primary image');
      setSaving(false);
      return;
    }

    const priceNum = parseFloat(form.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Please enter a valid price');
      setSaving(false);
      return;
    }

    if (editSlug && artworkId) {
      const { error } = await updateArtwork(artworkId, {
        title: form.title,
        description: form.description,
        price: priceNum,
        medium: form.medium,
        category: form.category,
        year: form.year ? parseInt(form.year) : undefined,
        width_cm: form.width_cm ? parseFloat(form.width_cm) : undefined,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : undefined,
        image_url: form.image_url,
        style: form.style,
        shipping_info: form.shipping_info,
        featured: form.featured,
        curated: form.curated,
      });
      if (error) { setError(error); setSaving(false); return; }
      navigate('/artist-dashboard');
    } else {
      const { slug, error } = await createArtwork(
        artistId,
        {
          title: form.title,
          description: form.description,
          price: priceNum,
          medium: form.medium,
          category: form.category,
          year: form.year ? parseInt(form.year) : 0,
          width_cm: form.width_cm ? parseFloat(form.width_cm) : 0,
          height_cm: form.height_cm ? parseFloat(form.height_cm) : 0,
          image_url: form.image_url,
          style: form.style,
          shipping_info: form.shipping_info,
          featured: form.featured,
          curated: form.curated,
        },
        extraImages,
      );
      if (error) { setError(error); setSaving(false); return; }
      navigate(`/artwork/${slug}`);
    }
  };

  return (
    <div className="container-content py-10 lg:py-14">
      <Link to="/artist-dashboard" className="label-eyebrow mb-6 inline-flex items-center gap-1.5 transition-colors hover:text-clay-500">
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
        Back to dashboard
      </Link>

      <h1 className="font-serif text-4xl font-light tracking-tightish text-ink animate-fade-up">
        {editSlug ? 'Edit artwork' : 'Upload new artwork'}
      </h1>

      <form onSubmit={handleSubmit} className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.2fr] animate-fade-up-d1">
        {/* Images */}
        <div className="space-y-4">
          {/* Primary image */}
          <div>
            <label className="label-eyebrow block">Primary image *</label>
            <div className="mt-2 aspect-[4/5] w-full overflow-hidden rounded-2xl border-2 border-dashed border-paper-line bg-paper-deep">
              {form.image_url ? (
                <img src={form.image_url} alt="Primary" className="h-full w-full object-cover" />
              ) : (
                <label className="flex h-full cursor-pointer flex-col items-center justify-center gap-2 text-ink-faint">
                  <Upload className="h-8 w-8" strokeWidth={1} />
                  <span className="font-sans text-sm">{uploadingImage ? 'Uploading…' : 'Click to upload'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, true)} />
                </label>
              )}
            </div>
            {form.image_url && (
              <label className="btn-outline mt-2 w-full cursor-pointer justify-center">
                <Upload className="h-4 w-4" strokeWidth={1.5} />
                Replace primary
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, true)} />
              </label>
            )}
          </div>

          {/* Additional images */}
          <div>
            <label className="label-eyebrow block">Additional images</label>
            <div className="mt-2 grid grid-cols-3 gap-3">
              {extraImages.map((url, idx) => (
                <div key={idx} className="relative aspect-square overflow-hidden rounded-lg border border-paper-line">
                  <img src={url} alt={`Extra ${idx + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExtraImage(idx)}
                    className="absolute right-1 top-1 rounded-full bg-ink/60 p-1 text-white transition-colors hover:bg-ink"
                  >
                    <X className="h-3 w-3" strokeWidth={2} />
                  </button>
                </div>
              ))}
              {extraImages.length < 6 && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-paper-line text-ink-faint transition-colors hover:border-ink/20">
                  <Plus className="h-5 w-5" strokeWidth={1.5} />
                  <span className="font-sans text-xs">Add</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, false)} />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-5">
          <Field label="Title" value={form.title} onChange={(v) => update('title', v)} required />
          <div>
            <label className="label-eyebrow block">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              rows={4}
              className="field mt-2 resize-none"
              placeholder="Describe the piece, its inspiration, its story…"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price (USD)" value={form.price} onChange={(v) => update('price', v)} type="number" required placeholder="0" />
            <div>
              <label className="label-eyebrow block">Category</label>
              <select
                value={form.category}
                onChange={(e) => update('category', e.target.value as ArtCategory)}
                className="field mt-2"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Medium" value={form.medium} onChange={(v) => update('medium', v)} placeholder="Oil on canvas" />
            <Field label="Style" value={form.style} onChange={(v) => update('style', v)} placeholder="Abstract, Realism…" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Year" value={form.year} onChange={(v) => update('year', v)} type="number" placeholder="2025" />
            <Field label="Width (cm)" value={form.width_cm} onChange={(v) => update('width_cm', v)} type="number" placeholder="50" />
            <Field label="Height (cm)" value={form.height_cm} onChange={(v) => update('height_cm', v)} type="number" placeholder="70" />
          </div>
          <div>
            <label className="label-eyebrow block">Shipping information</label>
            <textarea
              value={form.shipping_info}
              onChange={(e) => update('shipping_info', e.target.value)}
              rows={2}
              className="field mt-2 resize-none"
              placeholder="e.g. Ships rolled in a tube from Berlin within 5–7 days."
            />
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 font-sans text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => update('featured', e.target.checked)}
                className="h-4 w-4 rounded border-paper-line accent-clay-500"
              />
              Mark as featured (selected work)
            </label>
            <label className="flex items-center gap-2 font-sans text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={form.curated}
                onChange={(e) => update('curated', e.target.checked)}
                className="h-4 w-4 rounded border-paper-line accent-clay-500"
              />
              Include in curated collection
            </label>
          </div>

          {error && <p className="rounded-lg bg-clay-50 px-4 py-3 font-sans text-sm text-clay-600">{error}</p>}

          <button type="submit" disabled={saving} className="btn-accent">
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <>
                <Check className="h-5 w-5" strokeWidth={1.5} />
                {editSlug ? 'Save changes' : 'Publish artwork'}
              </>
            )}
          </button>
        </div>
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
        step={type === 'number' ? '0.01' : undefined}
        className={`field mt-2 ${error ? 'border-clay-400' : ''}`}
      />
      {error && <p className="mt-1.5 font-sans text-xs text-clay-500">{error}</p>}
    </div>
  );
}
