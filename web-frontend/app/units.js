/* Unit conversion for the display layer.

   Contract with the backend: every length is sent and stored in millimetres (mm),
   money in ₹ (INR), weights in kg, and counts as plain units or integers.
   The UI may display lengths in mm, cm, or inch (and more in the future) — conversion
   happens only at the display/input edge; application state always holds backend (mm) values. */

export const MM_PER_IN = 25.4;
export const MM_PER_CM = 10;

export const isIn = unit => unit === "inch";
export const isCm = unit => unit === "cm";

export const unitLabel = unit => {
  if (unit === "inch") return "inch";
  if (unit === "cm") return "cm";
  return "mm";
};

/* Backend mm -> number to show in the active unit ("" for empty/invalid). */
export const toDisp = (mm, unit) => {
  const x = +mm;
  if (mm === "" || mm == null || isNaN(x)) return "";
  if (unit === "inch") return +(x / MM_PER_IN).toFixed(2);
  if (unit === "cm") return +(x / MM_PER_CM).toFixed(2);
  return x;
};

/* Value typed in the active unit -> backend mm ("" for empty/invalid). */
export const toMM = (v, unit) => {
  const x = +v;
  if (v === "" || v == null || isNaN(x)) return "";
  if (unit === "inch") return Math.round(x * MM_PER_IN * 100) / 100;
  if (unit === "cm") return Math.round(x * MM_PER_CM * 100) / 100;
  return Math.round(x * 100) / 100;
};

/* Formatted length for plain text (tables, options): grouped mm, 2-dp cm or 2-dp inch. */
export const lenText = (mm, unit) => {
  if (unit === "inch") return (+mm / MM_PER_IN).toFixed(2);
  if (unit === "cm") return (+mm / MM_PER_CM).toFixed(2);
  return Math.round(+mm).toLocaleString("en-IN");
};

/* Area: backend m² -> display string. */
export const areaText = (m2, unit) => {
  if (unit === "inch") return Math.round(m2 * 1550.0031).toLocaleString("en-IN") + " in²";
  if (unit === "cm") return Math.round(m2 * 10000).toLocaleString("en-IN") + " cm²";
  return m2 + " m²";
};

/* "2.5–3.0" style ranges: backend mm -> active unit (mm passthrough). */
export const rangeDisp = (s, unit) => {
  if (unit === "mm" || typeof s !== "string" || !s.trim()) return s;
  return s.split(/(–|-)/).map(p => (/^[\d.]+$/.test(p.trim()) ? String(toDisp(p, unit)) : p)).join("");
};

/* Ranges: active unit -> backend mm string (mm passthrough). */
export const rangeMM = (s, unit) => {
  if (unit === "mm" || typeof s !== "string" || !s.trim()) return s;
  return s.split(/(–|-)/).map(p => {
    const t = p.trim();
    return /^[\d.]+$/.test(t) ? String(toMM(t, unit)) : p;
  }).join("");
};
