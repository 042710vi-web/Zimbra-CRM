export function formatCurrency(value) {
  const amount = Number(value);
  return amount === 0 ? 'Gratis' : `$${amount.toLocaleString('es-CO')}`;
}

export function formatDate(value = new Date()) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' }).format(value);
}
