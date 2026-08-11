// Formatting helpers shared by the UI.

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatINR(value) {
  return inr.format(Number(value) || 0);
}

export function formatNumber(value, digits = 2) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number(value) || 0);
}
