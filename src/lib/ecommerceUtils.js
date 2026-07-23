export const formatPrice = (amount, currency = 'HKD', rate = 0.128, symbols = { HKD: 'HK$', USD: '$' }) => {
  if (currency === 'USD') {
    const usd = amount * rate;
    return `${symbols.USD || '$'}${usd.toFixed(2)}`;
  }
  return `${symbols.HKD || 'HK$'}${amount.toFixed(0)}`;
};

export const calcSubtotal = (cartItems, products) => {
  let sum = 0;
  cartItems.forEach(ci => {
    const prod = products.find(p => p.id === ci.productId);
    if (!prod) return;
    let price = prod.price;
    if (ci.variantId && prod.variants) {
      const v = prod.variants.find(v => v.id === ci.variantId);
      if (v) price = v.price;
    }
    sum += price * ci.qty;
  });
  return sum;
};

export const getMembershipTier = (tiers, totalSpent) => {
  // tiers sorted ascending
  // Classic 1500, Signature 8000 upgrade? Logic: if total >= 8000 => signature else if >=1500 classic else none
  if (totalSpent >= 8000) return tiers.find(t => t.id === 'signature') || null;
  if (totalSpent >= 1500) return tiers.find(t => t.id === 'classic') || null;
  return null;
};

export const calcPoints = (amount, tier, isBirthdayMonth = false, birthdayLimit = 10000) => {
  if (!tier) return Math.floor(amount);
  let rate = tier.pointsRate || 1;
  let effectiveAmount = amount;
  if (isBirthdayMonth) {
    effectiveAmount = Math.min(amount, birthdayLimit);
    const extra = amount - effectiveAmount;
    // birthday multiplier only for limited portion
    const birthdayPoints = effectiveAmount * rate * (tier.birthdayMultiplier || 1);
    const normalPoints = extra * rate;
    return Math.floor(birthdayPoints + normalPoints);
  }
  return Math.floor(amount * rate);
};

export const isBirthdayMonth = (birthdayStr) => {
  if (!birthdayStr) return false;
  try {
    const b = new Date(birthdayStr);
    const now = new Date();
    return b.getMonth() === now.getMonth();
  } catch { return false; }
};

export const checkGWP = (subtotal, gwpRules) => {
  if (!gwpRules || !Array.isArray(gwpRules)) return null;
  const eligible = gwpRules.filter(r => r.active && subtotal >= r.minSpend).sort((a,b)=>b.minSpend-a.minSpend);
  return eligible[0] || null;
};

export const applyCoupon = (subtotal, coupon) => {
  if (!coupon || !coupon.active) return { discount: 0, valid: false, reason: 'Invalid coupon' };
  if (coupon.minSpend && subtotal < coupon.minSpend) return { discount: 0, valid: false, reason: `Min spend HK$${coupon.minSpend}` };
  let discount = 0;
  if (coupon.discountType === 'percentage') {
    discount = subtotal * (coupon.discountValue / 100);
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  } else {
    discount = coupon.discountValue;
  }
  discount = Math.min(discount, subtotal);
  return { discount, valid: true };
};

export const generateOrderId = () => {
  const d = new Date();
  const ymd = d.toISOString().slice(0,10).replace(/-/g,'');
  const rand = Math.floor(Math.random()*9000+1000);
  return `ORD-${ymd}-${rand}`;
};

export const generateReferralCode = (name) => {
  const prefix = (name || 'USER').slice(0,4).toUpperCase();
  const num = Math.floor(Math.random()*9000+1000);
  return `${prefix}${num}`;
};
