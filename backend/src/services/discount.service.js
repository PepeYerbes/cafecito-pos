export function calculateDiscountPercent(purchasesCount) {
  const n = purchasesCount ?? 0;
  if (n === 0) return 0;
  if (n >= 1 && n <= 3) return 5;
  if (n >= 4 && n <= 7) return 10;
  return 15; // n >= 8
}