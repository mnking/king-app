export const formatCurrency = (value?: number) => {
  if (typeof value !== 'number') return 'N/A';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatDateTime = (value?: string) => {
  if (!value) return 'N/A';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return 'N/A';
  }
};

export const getTodayLocalDateInput = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const toUtcIsoFromLocalDate = (dateInput: string) => {
  if (!dateInput) return undefined;
  const date = new Date(`${dateInput}T00:00:00`);
  return date.toISOString();
};
