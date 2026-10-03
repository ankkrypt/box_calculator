/* Standard packaging industry engineering specifications. */
export const TOL = { 3: 6, 5: 12, 7: 18, 9: 24 };

export const FLUTES = [
  { n: "S", f: 1.65, th: "5.0–5.5", d: "Very coarse flute for heavy duty protective industrial packing." },
  { n: "K", f: 1.6, th: "4.8–5.2", d: "Coarse flute for heavy duty bulk cartons and high stacking strength." },
  { n: "A", f: 1.53, th: "4.5–4.7", d: "Best stacking strength and cushioning. Fragile or heavy items." },
  { n: "C", f: 1.42, th: "3.5–3.7", d: "General purpose. Most common for shipping cartons." },
  { n: "B", f: 1.32, th: "2.5–3.0", d: "Good crush resistance and print surface. Canned goods, retail boxes." },
  { n: "D", f: 1.56, th: "4.0–4.4", d: "Between A and K flute, used for heavy bulk cartons." },
  { n: "E", f: 1.27, th: "1.1–1.8", d: "Thin and smooth. Retail, cosmetics and folding cartons." },
  { n: "F", f: 1.24, th: "0.8–1.2", d: "Fine flute. Small premium packs and mailers." },
  { n: "G", f: 1.2, th: "0.5–0.8", d: "Very fine micro flute for compact specialty packaging." },
  { n: "N", f: 1.15, th: "0.4–0.6", d: "Ultra-fine micro flute for high quality litho-laminated print." },
];

export const BOX_TYPES = [
  { value: "rsc", label: "RSC – regular slotted (0201)" },
  { value: "hsc", label: "HSC – half slotted (0200)" },
  { value: "fol", label: "FOL – full overlap (0204)" },
  { value: "tel", label: "Telescope – two piece (0320)" },
  { value: "fld", label: "One piece folder (0427)" },
];

export function role(i) {
  return i % 2 ? "flute" : "liner";
}

export function samplePlies(n) {
  return Array.from({ length: n }, () => ({
    gsm: "",
    bf: "",
    flute: "",
    reelId: "",
    price: "",
  }));
}
