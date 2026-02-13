export const generateReceiptNo = (prefix: string) => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const suffix = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `${prefix}-${yy}${mm}${dd}${suffix}`;
};
