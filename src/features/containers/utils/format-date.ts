export function padTwo(value: number) {
  return String(value).padStart(2, '0');
}

export function formatDateTimeForDisplay(value?: string | number | Date | null): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const day = padTwo(date.getDate());
  const month = padTwo(date.getMonth() + 1);
  const year = date.getFullYear();
  const hour = date.getHours();
  const minute = padTwo(date.getMinutes());
  const second = padTwo(date.getSeconds());
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = padTwo(hour % 12 === 0 ? 12 : hour % 12);
  return `${day}/${month}/${year} ${hour12}:${minute}:${second} ${period}`;
}
