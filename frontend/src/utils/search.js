export function normalizeSearchValue(value) {
  if (value == null || !['string', 'number'].includes(typeof value)) return '';
  const text = String(value);
  return /^(?:null|undefined)$/i.test(text.trim()) ? '' : text;
}
