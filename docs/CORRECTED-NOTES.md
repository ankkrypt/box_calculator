# Corrected Research Notes — v2 (Sep 2026 research → vendor SaaS docs)

> Scope: your Sep 2026 research notes → the vendor SaaS platform docs
> (BRD v2.0, PRD v2.0, Flow charts v2.0). The prototype code in
> `src/lib/calculator/*` implements an **older public-calculator** product and
> was **left untouched** per your instruction. Where your research and the
> code disagree, these notes record the decisions taken.

---

## 1. Verified correct in your research ✅

1. **Flute take-up factor concept** — "total GSM = outer + inner + flute × take-up factor" is the right idea, per layer. Verified take-up factors: **A ≈ 1.55, C ≈ 1.44, B ≈ 1.33, E ≈ 1.27** (±5% by supplier). N-flute (≈1.1 mm, micro-flute for folding-carton-like fine flutes) sits below E; treat as supplier-specific.
2. **Bursting strength formula** — BS = BF × GSM ÷ 1000 (kg/cm²) is correct; board BS = Σ per-layer BS. BF ranges confirmed: kraft 16–40, testliner 20–35.
3. **Score tolerance ladder** — 6 mm (3-ply), 12 mm (5-ply), 18 mm (7-ply), 24 mm (9-ply) is a coherent pattern; note 5-ply (12 mm) fits the arithmetic ladder, but confirm with a real vendor.
4. **Sheet weight from reel** — `sheetWeightKg = sheetL(mm) × sheetW(mm) × GSM ÷ 10⁹` is the standard conversion (research wrote ÷1000 with "height × width" — dimension/units ambiguity, corrected in docs).
5. **Reels 0.5–3 t** — confirmed typical; deckle/width can be in mm or inches; engine stores mm.
6. **Per-layer GSM/BF** — "each layer in a ply and even flute in same product will have different GSM" — correct and adopted as the core engine design (no blended GSM).
7. **Custom box-type names** — vendors do name boxes for their trade (e.g., "Mithai 5-ply", "Exporter 5-ply 240"); adopted as a BoxType entity per tenant.
8. **No generic labels in UI** — RSC/Pizza/Shoe stay **internal IDs**; UI shows vendor names only.
9. **Module list** — Auth/RBAC, Inventory, Calculator, Quotation, Orders, Subscription matches the vendor workflow; Orders moved to Phase 2 (quote-first workflow).
10. **Expo for mobile** — good fit: JS/React reuses the engine; Capacitor also viable later; Kotlin rejected (learning curve) — matches your reasoning.
11. **GSM 100–400, transport line, conversion cost ₹/kg** — plausible placeholders; all made tenant-configurable rather than hardcoded (waste % later promoted to engine-computed, see D9).
12. **Manual inventory entry first** — right call for MVP; CSV import is cheap to add later.

## 2. Corrections made to your research ⚠️

| # | Research said | Correction in docs |
|---|---|---|
| R1 | "Pandora API for 3D models — repo from github" | **Resolved.** The repo is `uuuulala/Threejs-folding-cardboard-box-tutorial` (Three.js + GSAP folding cardboard box — the Codrops tutorial). It is a hard-coded demo, not a library — docs specify a parametric reimplementation driving the fold from quote dimensions; **verify the repo's license before shipping adapted code**. |
| R2 | "Flutes: ???" | Completed: **A, C, B, E, N** (+F for micro); heights A 4.5–4.7 mm, C 3.5–3.7, B 2.1–2.9, E 1.1–1.6; take-up factors above. |
| R3 | "Sheets: ???" | Completed: a sheet is reel paper converted (corrugated + pasted) into board, cut to the box blank size; reel→sheet count = floor(reelWeight ÷ sheetWeight). |
| R4 | "More types of boxes: ???" | Completed as the Phase-3 catalogue list (pizza, mithai, mailer, 6-bottle, 4-bottle carrier, document storage, display, tray, sleeve, window, magnetic closure etc.) — each = a `BoxType` with a `sheetFormula`; slotted family vs die-cut family. |
| R5 | "BF: taken from pre-made sheet from supplier" | Partly right: **reel BF/GSM come from the supplier** (mill certificates); the calculator lets staff pick the reel, so BF flows from inventory — not entered ad hoc. |
| R6 | "GSM is between 100–300" | Widened to **100–400** (testliner goes to 300–350+; kraft to 400 in heavy grades). Validation range set 100–400. |
| R7 | "BF usually between 18–32" | Verified wider: **16–40** across kraft/testliner grades. |
| narrow | "Cutting methods" framing | Kept: slotted → always corrugated; die-cut → corrugated **or** folding carton. Drives `cutMethod` on BoxType and which sheet formula applies. |
| R9 | "Flute take-up factor value?" | Answered per flute (see 1.1); stored per flute type, supplier-overridable. |
| R9b | "cost per box = all ply layer price + conversion cost + margin; total = cost per box × qty; final = total + transportation + tax" | **Adopted (decision D8): margin applied per box**, replacing the v1 order-level margin + discount pipeline. Pipeline: paper + conversion + margin → costPerBox → × qty → + transport + tax. Order-level discount dropped (optional later). |
| R9c | "waste percent should be calculated as we have the reel data" | **Adopted (decision D9):** waste % computed per layer from reel deckle offcut — (1 − sheetsAcross × sheetWidth ÷ deckle) × 100 — replacing the v1 hardcoded 18% default. Optional tenant process-waste add-on retained for setup/pasting rejects. |
| R10 | "Weight of 1 sheet from reel = height × width × GSM / 1000 (kg)" | Corrected units: **L(mm) × W(mm) × GSM ÷ 10⁹ kg** (÷1000 only works if dimensions are in metres). |
| R11 | "Score tolerance range 6-3ply-12-5ply-18-7ply-24-9ply" | Adopted as the standard ladder; engine takes it per BoxType (admin-editable) since liners/flute combos vary. |
| R12 | "Waste percent" (blank) | Default **18%** per layer (research v1 hint), admin-editable per layer/vendor; to be tuned against pilot vendors' actuals. |
| R13 | "Conversion rate 10inr per kg" | Kept as placeholder default; tenant-level setting. Ask vendors separately (includes machines, labour, corrugating, slotting, printing, stitching). |
| R14 | "Expected number of users?" | Unanswered; treated as a launch-KPI question, not a build blocker. Suggested targets in BRD O4/O5. |
| R15 | "Payment gateway one time or subscription?" | Decision framed in docs: **subscription** (SaaS), provider Creem or Razorpay — decision D6, open. |
| R16 | "Sass" (typo) | Read as **SaaS**; vendor-tenant model adopted. |

## 3. Decision log

| # | Decision | Options | Default in docs |
|---|---|---|---|
| D1 | Markup scope (old calculator) | material only vs material+finishing | superseded by per-layer costing |
| D2 | Tax display | hide / indicative line | indicative GST 12% line, CA to confirm |
| D3 | Rate management | hardcoded / admin panel / API | per-tenant settings + inventory (no hardcoded rates) |
| D4 | Launch box types | RSC only / more | industry-standard slotted family (RSC + HSC + FOL) first; Telescope/OPF and die-cut later (see D11) |
| D5 | Mobile approach | RN-Expo / Capacitor / PWA | Expo (Capacitor fallback) |
| D6 | Subscription provider | Creem / Razorpay | **open — decide before R2** (Razorpay for UPI-heavy India) |
| D7 | 3D preview source | "Pandora" repo / Three.js | `uuuulala/Threejs-folding-cardboard-box-tutorial`, parametric (license check pending) |
| D8 | Margin placement | per box / order-level | **Per box** (user-confirmed): costPerBox = paper + conversion + margin; total = ×qty; final = + transport + tax |
| D9 | Waste % | hardcoded default / computed | **Computed from reel deckle offcut** (user-confirmed), optional process-waste add-on |
| D10 | Conversion cost | system default / vendor-supplied | **Vendor-supplied, required** (user-confirmed) — no system default |
| D11 | Box catalogue | vendor-invented / industry standard | **Industry-standard styles**: RSC (kept, default), HSC, FOL, Telescope, OPF; vendor trade names as aliases |

## 4. What remains open (blockers for build, not for review)

1. **GST %** — CA confirmation (12% assumed for corrugated boxes).
2. **5-ply score tolerance** — 12 mm per ladder; confirm with a real vendor.
3. **Waste % defaults** — validate against 2–3 vendors' actual consumption.
4. **Deckle/width matching rule** — reject narrower reels, or allow rotation/two-up? (PRD open question.)
5. **Conversion rate** — flat ₹/kg per tenant vs per machine/season.
6. **Paywall split** — free vs paid feature list (quotes/mo, branding, 3D, seats).
7. **3D repo license** — confirm `uuuulala/Threejs-folding-cardboard-box-tutorial` licensing before adapting its code.
8. **Margin base** — per-box margin currently applies to (paper + conversion); confirm whether future finishing/printing extras join the margin base.
9. **Waste formula scope** — deckle offcut covers trim loss only; validate with pilots whether a process-waste add-on (setup, pasting rejects) is also needed.
10. **Conversion cost capture** — vendor-supplied ₹/kg: at tenant level, per box type, or per quote?

---

*These notes accompany BRD v2.0, PRD v2.0 and FLOWCHART v2.0 in this folder.*
