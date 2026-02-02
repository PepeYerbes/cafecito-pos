
const Sale = require('../models/Sale');

function progressiveDiscount(purchasesCount) {
  if (!purchasesCount || purchasesCount === 0) return 0;
  if (purchasesCount >= 1 && purchasesCount <= 3) return 5;
  if (purchasesCount >= 4 && purchasesCount <= 7) return 10;
  return 15; // 8+
}

function weeklyFrequencyDiscount(visitsThisWeek) {
  return visitsThisWeek >= 3 ? 15 : 0; // regla 4A
}

async function getVisitsThisWeek(customerId) {
  if (!customerId) return 0;

  const now = new Date();
  const day = now.getDay(); // 0 domingo
  const diffToMonday = (day + 6) % 7; // lunes=0
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const visits = await Sale.countDocuments({
    customerId,
    status: 'PAID',
    createdAt: { $gte: monday, $lte: sunday },
  });

  return visits;
}

async function computeDiscount({ purchasesCount, customerId }) {
  const base = progressiveDiscount(purchasesCount || 0);
  const weeklyVisits = await getVisitsThisWeek(customerId);
  const weekly = weeklyFrequencyDiscount(weeklyVisits);
  const discountPercent = Math.max(base, weekly);
  return { discountPercent, weeklyVisits };
}

module.exports = {
  progressiveDiscount,
  weeklyFrequencyDiscount,
  computeDiscount,
};
