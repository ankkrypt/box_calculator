"use client";

/* Die-cut chart (flat blank, nominal size). Solid = cut, dashed = crease. */
export default function DieChart({ type, L, W, H, J }) {
  const rect = (x, y, a, c, k) => `<rect class="${k}" x="${x}" y="${y}" width="${a}" height="${c}"/>`;
  const ln = (x1, y1, x2, y2, k) => `<line class="${k}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  const plus = (ox, oy, l, w, q) => {
    const P = [[q,0],[q+l,0],[q+l,q],[l+2*q,q],[l+2*q,q+w],[q+l,q+w],[q+l,w+2*q],[q,w+2*q],[q,q+w],[0,q+w],[0,q],[q,q]]
      .map(a => a[0]+ox + "," + (a[1]+oy)).join(" ");
    return `<polygon class="c" points="${P}"/>` + rect(ox+q, oy+q, l, w, "d");
  };

  let b = "", w = 0, h = 0;
  if (type === "tel") {
    const h2 = Math.round(H * .4), g = H * .6, ox = L + 2 * H + g;
    b = plus(0, 0, L, W, H) + plus(ox, H - h2, L, W, h2);
    w = ox + L + 2 * h2; h = W + 2 * H;
  } else if (type === "fld") {
    b = plus(0, W, L, W, H) + rect(H, 0, L, W, "f")
      + ln(H, W, H, 0, "c") + ln(H, 0, H+L, 0, "c") + ln(H+L, 0, H+L, W, "c")
      + ln(H, W, H+L, W, "k") + ln(H, W, H+L, W, "d");
    w = L + 2 * H; h = 2 * W + 2 * H;
  } else {
    const tF = type === "rsc" ? W/2 : type === "fol" ? W : 0;
    const bF = type === "fol" ? W : W/2;
    const ws = [J, L, W, L, W], T = ws.reduce((a,c) => a+c, 0), xs = [];
    let x = 0;
    ws.forEach(v => { xs.push(x); x += v; });
    b += rect(0, tF, T, H, "f");
    xs.forEach((x0, i) => { if (i > 0) { if (tF > 0) b += rect(x0, 0, ws[i], tF, "c"); b += rect(x0, tF+H, ws[i], bF, "c"); } });
    b += ln(0, tF, 0, tF+H, "c") + ln(T, tF, T, tF+H, "c") + ln(0, tF, J, tF, "c") + ln(0, tF+H, J, tF+H, "c");
    if (tF === 0) b += ln(0, 0, T, 0, "c");
    if (tF > 0) b += ln(J, tF, T, tF, "k") + ln(J, tF, T, tF, "d");
    b += ln(J, tF+H, T, tF+H, "k") + ln(J, tF+H, T, tF+H, "d");
    for (let i = 1; i < 5; i++) b += ln(xs[i], tF, xs[i], tF+H, "d");
    w = T; h = tF + H + bF;
  }

  const m = Math.max(w, h) * .03 + 1;
  return (
    <svg viewBox={`${-m} ${-m} ${w + 2*m} ${h + 2*m}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Die cut chart"
      dangerouslySetInnerHTML={{ __html: b }} />
  );
}
