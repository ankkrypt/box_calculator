/**
 * Corrugated Box Packaging Engineering Calculator
 * Pure calculation logic for dimensions, paper weights, bursting strength, and pricing.
 * Standard units: mm, kg, ₹, integer.
 */

const DEFAULT_FLUTE_FACTORS = {
  S: 1.65,
  K: 1.6,
  A: 1.53,
  C: 1.42,
  B: 1.32,
  D: 1.56,
  E: 1.27,
  F: 1.24,
  G: 1.2,
  N: 1.15,
};

const DEFAULT_TOL = {
  3: 6,
  5: 12,
  7: 18,
  9: 24,
};

/**
 * Step 4: Calculates blank sheet dimensions (mm) and area (m²) depending on box type
 */
function calculateSheetDimensions({ type = "rsc", L, W, H, J = 35, tol = 12 }) {
  const l = Number(L) || 400;
  const w = Number(W) || 300;
  const h = Number(H) || 250;
  const j = Number(J) || 35;
  const t = Number(tol) || 12;

  let blankLength = 0;
  let blankWidth = 0;

  switch (type.toLowerCase()) {
    case "hsc":
      // Half slotted container (0200): bottom flaps only
      blankLength = Math.round(2 * (l + w) + 4 * t + j);
      blankWidth = Math.round(w / 2 + h + t);
      break;

    case "fol":
      // Full overlap container (0204): flaps overlap full width on top and bottom
      blankLength = Math.round(2 * (l + w) + 4 * t + j);
      blankWidth = Math.round(2 * w + h + 2 * t);
      break;

    case "tel":
    case "telescope":
      // Two-piece telescope box (0320): tray + lid
      blankLength = Math.round(2 * (l + 2 * h + 2 * t));
      blankWidth = Math.round(w + 2 * h + 2 * t);
      break;

    case "fld":
    case "folder":
    case "one piece folder":
      // One piece folder (0427): roll-end folder
      blankLength = Math.round(2 * l + 2 * h + 2 * t + j);
      blankWidth = Math.round(w + 2 * h + 2 * t);
      break;

    case "rsc":
    default:
      // Regular slotted container (0201)
      blankLength = Math.round(2 * (l + w) + 4 * t + j);
      blankWidth = Math.round(w + h + 2 * t);
      break;
  }

  // Ensure minimum valid dimensions
  blankLength = Math.max(100, Math.round(blankLength));
  blankWidth = Math.max(50, Math.round(blankWidth));

  // Step 5: Sheet area in m²
  const sheetArea = Number(((blankLength * blankWidth) / 1000000).toFixed(4));

  return {
    blankLength,
    blankWidth,
    sheetArea,
  };
}

/**
 * Step 3, 7, 9 & 11: Calculates board weights, ply costs without per-ply wastage, and bursting strength (BS)
 */
function calculateBoardOutputs({
  ply = 5,
  plies = [],
  flutes = [],
  sheetArea = 0.85,
}) {
  const plyCount = Number(ply) || 5;

  const fluteMap = { ...DEFAULT_FLUTE_FACTORS };
  if (Array.isArray(flutes)) {
    flutes.forEach((f) => {
      if (f && f.n && f.f) {
        fluteMap[f.n] = Number(f.f);
      }
    });
  }

  let totalBoardGSM = 0;
  let totalPaperCostPerBox = 0;
  let totalBS = 0;

  const resolvedPlies = [];

  for (let i = 0; i < plyCount; i += 1) {
    const isLiner = i % 2 === 0;
    const p = plies[i] || {};
    const gsm = Number(p.gsm) || (isLiner ? 150 : 120);
    const bf = Number(p.bf) || (isLiner ? 20 : 16);
    const fluteName = p.flute || "B";
    const takeUp = isLiner ? 1.0 : Number(fluteMap[fluteName]) || 1.32;
    const pricePerKg = Number(p.price) >= 0 ? Number(p.price) : 0;

    const plyWeightGsm = gsm * takeUp;
    totalBoardGSM += plyWeightGsm;

    // Weight of this ply in 1 box sheet (in kg) = (sheetArea * plyWeightGsm) / 1000
    const plyWeightKg = (sheetArea * plyWeightGsm) / 1000;

    // Step 7 & 9: Ply layer cost = sheet weight of this ply * price per kg (no per-layer wastage)
    const plyCost = plyWeightKg * pricePerKg;
    totalPaperCostPerBox += plyCost;

    // Bursting strength (BS) in kg/cm² = (GSM * BF) / 1000
    const plyBS = (gsm * bf) / 1000;
    // Flute contributes ~80%
    totalBS += isLiner ? plyBS : plyBS * 0.8;

    resolvedPlies.push({
      plyIndex: i + 1,
      role: isLiner ? "liner" : "flute",
      gsm,
      bf,
      takeUp,
      pricePerKg,
      plyWeightKg: Number(plyWeightKg.toFixed(4)),
      plyCost: Math.round(plyCost * 100) / 100,
    });
  }

  // Starch adhesive weight allowance: ~20g per m² per flute layer
  const fluteLayers = Math.floor(plyCount / 2);
  const starchGSM = fluteLayers * 20;

  // Step 11: Weight of 1 box in kg
  const weightOfOneBoxKg = Number(
    ((sheetArea * (totalBoardGSM + starchGSM)) / 1000).toFixed(3)
  );

  // Step 11: Overall BS in kg/cm²
  const overallBS = Number(totalBS.toFixed(2));

  return {
    resolvedPlies,
    totalBoardGSM: Math.round(totalBoardGSM),
    weightOfOneBoxKg,
    paperCostPerBox: Math.round(totalPaperCostPerBox * 100) / 100,
    overallBS,
  };
}

/**
 * Step 10: Quotation calculation with vendor wastage % applied at the end
 */
function calculateQuotation({ order = {}, board = {}, pricing = {} }) {
  const L = Number(order.L) || 400;
  const W = Number(order.W) || 300;
  const H = Number(order.H) || 250;
  const Q = Number(order.Q) || 1000;
  const J = Number(order.J) || 35;
  const tol = Number(board.tolAll) || DEFAULT_TOL[board.ply] || 12;

  // Step 4 & 5: Sheet dimensions & area
  const sheet = calculateSheetDimensions({
    type: order.type || "rsc",
    L,
    W,
    H,
    J,
    tol,
  });

  // Step 3, 7, 9: Board outputs & ply paper costs
  const boardOut = calculateBoardOutputs({
    ply: board.ply || 5,
    plies: board.plies || [],
    flutes: board.flutes || [],
    sheetArea: sheet.sheetArea,
  });

  // Step 10: Quotation Pricing Breakdown
  // 1. Base paper cost per box (sum of each ply sheet weight * price per kg)
  const paperCostPerBox = boardOut.paperCostPerBox;

  // 2. Vendor wastage % (default 5%, applied at the quotation level)
  const wastagePct =
    pricing.extra !== undefined && pricing.extra !== null
      ? Number(pricing.extra)
      : board.extra !== undefined && board.extra !== null
      ? Number(board.extra)
      : 5;
  const wastagePerBox = Math.round(paperCostPerBox * (wastagePct / 100) * 100) / 100;
  const paperCostWithWastage = paperCostPerBox + wastagePerBox;

  // 3. Conversion ₹/box (from vendor settings, default ₹2)
  const conversionPerBox = Number(pricing.conv) >= 0 ? Number(pricing.conv) : 2;

  // 4. Margin % (from vendor settings, default 10%)
  const marginPct = Number(pricing.marg) >= 0 ? Number(pricing.marg) : 10;
  const baseCostBeforeMargin = paperCostWithWastage + conversionPerBox;
  const marginAmountPerBox = Math.round(baseCostBeforeMargin * (marginPct / 100) * 100) / 100;
  const costPerBoxWithMargin = Math.round((baseCostBeforeMargin + marginAmountPerBox) * 100) / 100;

  // 5. Total cost for quantity Q
  const totalPcsCost = Math.round(costPerBoxWithMargin * Q * 100) / 100;

  // 5b. Discount % (from vendor quotation rates, default 0%)
  const discountPct = Number(pricing.discount) >= 0 ? Number(pricing.discount) : 0;
  const discountAmount = Math.round(totalPcsCost * (discountPct / 100) * 100) / 100;
  const totalAfterDiscount = Math.round((totalPcsCost - discountAmount) * 100) / 100;

  // 6. Transport ₹ (daily editable, default 3500)
  const transportCost = Number(pricing.trans) >= 0 ? Number(pricing.trans) : 3500;

  // 7. Tax (GST %) (from vendor settings, default 5%)
  const taxPct = Number(pricing.tax) >= 0 ? Number(pricing.tax) : 5;
  const taxableAmount = totalAfterDiscount + transportCost;
  const taxAmount = Math.round(taxableAmount * (taxPct / 100) * 100) / 100;

  // 8. Final Order Price
  const finalOrderPrice = Math.round((taxableAmount + taxAmount) * 100) / 100;

  // Step 11: Weights
  const orderWeightKg = Math.round(boardOut.weightOfOneBoxKg * Q);
  const blanksPerReel = Math.max(1, Math.floor(1500 / sheet.blankWidth));
  const reelWidthNeeded = sheet.blankWidth;

  return {
    sheet: {
      length: sheet.blankLength,
      width: sheet.blankWidth,
      area: sheet.sheetArea,
      reelWidthNeeded,
      scoreTol: tol,
      sizeText: `${sheet.blankLength} × ${sheet.blankWidth} mm`,
    },
    quote: {
      paperCostPerBox: Number(paperCostPerBox.toFixed(2)),
      wastagePct,
      wastagePerBox: Number(wastagePerBox.toFixed(2)),
      conversionPerBox: Number(conversionPerBox.toFixed(2)),
      costPerBoxWithMargin: Number(costPerBoxWithMargin.toFixed(2)),
      totalPcsCost: Number(totalPcsCost.toFixed(2)),
      discountPct,
      discountAmount: Number(discountAmount.toFixed(2)),
      totalAfterDiscount: Number(totalAfterDiscount.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      transportCost: Number(transportCost.toFixed(2)),
      finalOrderPrice: Number(finalOrderPrice.toFixed(2)),
      marginPct,
      taxPct,
      quantity: Q,
    },
    summary: {
      boxWeight: boardOut.weightOfOneBoxKg,
      orderWeight: orderWeightKg,
      overallBS: boardOut.overallBS,
      ply: board.ply || 5,
      blanksPerReel,
    },
    board: boardOut,
  };
}

module.exports = {
  calculateSheetDimensions,
  calculateBoardOutputs,
  calculateQuotation,
  DEFAULT_FLUTE_FACTORS,
  DEFAULT_TOL,
};
