export function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDimensions(
  widthCm: number | null,
  heightCm: number | null,
): string | null {
  if (!widthCm || !heightCm) return null;
  const wIn = (widthCm / 2.54).toFixed(1).replace(/\.0$/, '');
  const hIn = (heightCm / 2.54).toFixed(1).replace(/\.0$/, '');
  return `${widthCm} × ${heightCm} cm (${wIn} × ${hIn} in)`;
}
