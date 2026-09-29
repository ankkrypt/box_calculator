/* Unit conversion for the display layer.

   Contract with the backend: every length is sent and stored in millimetres (mm),
   money in ₹ (INR), weights in kg, and counts as plain units or integers.
   The UI may display lengths in mm or inch — conversion happens only at the
   display/input edge; application state always holds the backend (mm) values. */

export const MM_PER_IN = 25.4;

export const isIn = unit => unit === "inch";
export const unitLabel = unit => (isIn(unit) ? "inch" : "mm");

/* Backend mm -> number to show in the active unit ("" for empty/invalid). */
export const toDisp = (mm, unit) => {
  const x = +mm;
  if (mm === "" || mm == null || isNaN(x)) return "";
  return isIn(unit) ? +(x / MM_PER_IN).toFixed(2) : x;
};

/* Value typed in the active unit -> backend mm ("" for empty/invalid). */
export const toMM = (v, unit) => {
  const x = +v;
  if (v === "" || v == null || isNaN(x)) return "";
  return isIn(unit) ? Math.round(x * MM_PER_IN * 100) / 100 : Math.round(x * 100) / 100;
};

/* Formatted length for plain text (tables, options): grouped mm or 2-dp inch. */
export const lenText = (mm, unit) =>
  isIn(unit) ? (+mm / MM_PER_IN).toFixed(2) : Math.round(+mm).toLocaleString("en-IN");

/* Area: backend m² -> display string. */
export const areaText = (m2, unit) =>
  isIn(unit) ? Math.round(m2 * 1550.0031).toLocaleString("en-IN") + " in²" : m2 + " m²";

/* "2.5–3.0" style ranges: backend mm -> active unit (mm passthrough). */
export const rangeDisp = (s, unit) =>
  !isIn(unit) || typeof s !== "string" || !s.trim()
    ? s
    : s.split(/(–|-)/).map(p => (/^[\d.]+$/.test(p.trim()) ? String(toDisp(p, unit)) : p)).join("");

/* Ranges: active unit -> backend mm string (mm passthrough). */
export const rangeMM = (s, unit) =>
  !isIn(unit) || typeof s !== "string" || !s.trim()
    ? s
    : s.split(/(–|-)/).map(p => {
        const t = p.trim();
        return /^[\d.]+$/.test(t) ? String(Math.round(+t * MM_PER_IN * 10) / 10) : p;
      }).join("");
