"use client";

/**
 * Die-cut chart (flat blank, nominal size).
 * Solid outline = cut edge, dashed = crease/score, filled rect = panel.
 *
 * RSC (0201) - Regular Slotted Container: columns [J,L,W,L,W], top+bottom flaps each W/2
 * HSC (0200) - Half Slotted: same columns, bottom flaps only (open top)
 * FOL (0204) - Full Overlap: same columns, flaps = full W top and bottom
 * TEL (0320) - Telescope 2-piece: two plus-shaped blanks side-by-side (base + lid)
 * FLD (0427) - One-Piece Folder: rect blank [H|L|H+J] wide x [H|W|H] tall with score grid
 */
export default function DieChart({ type, L, W, H, J }) {
  const t = (type || "rsc").toLowerCase();
  const j = Number(J) || 35;

  const rect = (x, y, a, c, k) =>
    `<rect class="${k}" x="${x}" y="${y}" width="${a}" height="${c}"/>`;
  const ln = (x1, y1, x2, y2, k) =>
    `<line class="${k}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  const txt = (x, y, s) =>
    `<text class="lbl" x="${x}" y="${y}" text-anchor="middle">${s}</text>`;

  /** plus-shape tray blank: inner l x w, flap depth q on all 4 sides, offset (ox,oy) */
  const plus = (ox, oy, l, w, q) => {
    const pts = [
      [q, 0], [q + l, 0], [q + l, q], [l + 2 * q, q],
      [l + 2 * q, q + w], [q + l, q + w], [q + l, w + 2 * q],
      [q, w + 2 * q], [q, q + w], [0, q + w], [0, q], [q, q],
    ].map(a => (a[0] + ox) + "," + (a[1] + oy)).join(" ");
    return `<polygon class="c" points="${pts}"/>` + rect(ox + q, oy + q, l, w, "d");
  };

  let b = "", svgW = 0, svgH = 0;

  if (t === "tel" || t === "telescope") {
    /* Telescope (0320): base tray + lid tray drawn side by side */
    const h2 = Math.round(H * 0.4);
    const gap = Math.round(H * 0.25);
    b += plus(0, 0, L, W, H);                             // base: flap = H
    const ox = L + 2 * H + gap;
    const oy = Math.round((H - h2) / 2);
    b += plus(ox, oy, L, W, h2);                          // lid: flap = h2, centred
    svgW = ox + L + 2 * h2;
    svgH = W + 2 * H;
    b += txt((L + 2 * H) / 2, svgH + 14, "Base");
    b += txt(ox + (L + 2 * h2) / 2, svgH + 14, "Lid");

  } else if (t === "fld" || t === "folder" || t === "one piece folder") {
    /* One-Piece Folder (0427)
       Blank cols: left-wall H | body L | right-wall (H+J glue tab)
       Blank rows: top-cover H | base W | bottom-cover H  */
    const bw = H + L + H + j;
    const bh = H + W + H;
    b += rect(0, 0, bw, bh, "c");          // outer cut boundary
    b += rect(H, H, L, W, "f");            // body base panel
    b += rect(0, H, H, W, "c");            // left side wall
    b += rect(H + L, H, H + j, W, "c");    // right side wall + glue tab
    b += rect(H, 0, L, H, "c");            // top cover flap
    b += rect(H, H + W, L, H, "c");        // bottom cover flap
    b += ln(H, 0, H, bh, "d");              // left vertical score
    b += ln(H + L, 0, H + L, bh, "d");      // right vertical score
    b += ln(0, H, bw, H, "d");               // top horizontal score
    b += ln(0, H + W, bw, H + W, "d");       // bottom horizontal score
    svgW = bw;
    svgH = bh;

  } else {
    /* RSC / HSC / FOL: slotted family with columns [J, L, W, L, W] */
    const tF = t === "rsc" ? W / 2 : t === "fol" ? W : 0;
    const bF = t === "fol" ? W : W / 2;
    const ws = [j, L, W, L, W];
    const T = ws.reduce((a, c) => a + c, 0);
    const xs = [];
    let x = 0;
    ws.forEach(v => { xs.push(x); x += v; });
    b += rect(0, tF, T, H, "f");   // main body
    xs.forEach((x0, i) => {
      if (i === 0) return;
      if (tF > 0) b += rect(x0, 0, ws[i], tF, "c");
      b += rect(x0, tF + H, ws[i], bF, "c");
    });
    b += ln(0, tF, 0, tF + H, "c");
    b += ln(T, tF, T, tF + H, "c");
    b += ln(0, tF, j, tF, "c");
    b += ln(0, tF + H, j, tF + H, "c");
    if (tF === 0) b += ln(0, 0, T, 0, "c");
    if (tF > 0) b += ln(j, tF, T, tF, "k") + ln(j, tF, T, tF, "d");
    b += ln(j, tF + H, T, tF + H, "k") + ln(j, tF + H, T, tF + H, "d");
    for (let i = 1; i < 5; i++) b += ln(xs[i], tF, xs[i], tF + H, "d");
    svgW = T;
    svgH = tF + H + bF;
  }

  const m = Math.max(svgW, svgH) * 0.03 + 1;
  return (
    <svg
      viewBox={`${-m} ${-m} ${svgW + 2 * m} ${svgH + 2 * m}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Die cut chart"
      dangerouslySetInnerHTML={{ __html: b }}
    />
  );
}
