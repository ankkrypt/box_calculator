// Pure calculation engine for corrugated box pricing.
// Mirrors the 7-step algorithm 1:1. No React/UI code here, so it can be
// unit-tested and reused by any box style.

import {
  PLY_GSM,
  PAPER_COSTS,
  COATINGS,
  PRINTING_OPTIONS,
  MARKUP_TIERS,
} from "./constants";
import { BOX_TYPES } from "./boxTypes";

const MM2_PER_M2 = 1_000_000;

// ---------- Step 1: flat sheet size (mm) for one box ----------
export function sheetDimensions(boxTypeId, input) {
  const type = BOX_TYPES[boxTypeId];
  if (!type || typeof type.sheetDimensions !== "function") {
    throw new Error(`sheetDimensions not implemented for box type "${boxTypeId}"`);
  }
  return type.sheetDimensions(input);
}

// ---------- Step 2: sheet surface area in m2 ----------
export function sheetArea(sheet) {
  return (sheet.sheetLength * sheet.sheetWidth) / MM2_PER_M2;
}

// ---------- Step 3: material weight (kg) for one box ----------
export function boxWeightKg(sheetAreaM2, ply) {
  return (sheetAreaM2 * PLY_GSM[ply]) / 1000;
}

// Markup multiplier for a given quantity (step 4 input)
export function markupForQuantity(quantity) {
  return markupTierForQuantity(quantity).markup;
}

// Helper for the UI — which markup tier applies to a quantity
export function markupTierForQuantity(quantity) {
  return MARKUP_TIERS.find((tier) => quantity <= tier.max);
}

// ---------- Step 4: material cost for one box ----------
// cost = weight * paper cost per kg * markup
export function materialCost(boxWeightKg, paperCostPerKg, markup) {
  return boxWeightKg * paperCostPerKg * markup;
}

// ---------- Step 5: finishing (coating + printing) and unit price ----------
export function finishingCost(sheetAreaM2, coatingId, printingId) {
  const coating = COATINGS.find((c) => c.id === coatingId);
  const printing = PRINTING_OPTIONS.find((p) => p.id === printingId);
  const coatingCost = sheetAreaM2 * coating.ratePerSqm;
  const printingCost = printing.ratePerBox;
  return { coatingCost, printingCost, total: coatingCost + printingCost };
}

// ---------- Step 6: cost of the total order quantity ----------
export function totalQuantityCost(unitPrice, quantity) {
  return unitPrice * quantity;
}

// ---------- Step 7: one-time set-up costs ----------
export function oneTimeCostTotal(oneTimeCosts) {
  return Object.values(oneTimeCosts).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0
  );
}

export function grandTotal(totalQuantityCost, oneTimeCostTotal) {
  return totalQuantityCost + oneTimeCostTotal;
}

// ---------- Orchestrator: run the full 7-step quote ----------
// Returns every intermediate value so the UI can show a full breakdown.
export function calculateQuote(form) {
  const sheet = sheetDimensions(form.boxType, form);
  const areaM2 = sheetArea(sheet);
  const weightKg = boxWeightKg(areaM2, form.ply);
  const markup = markupForQuantity(form.quantity);

  const material = materialCost(weightKg, form.paperCostPerKg, markup);
  const finishing = finishingCost(areaM2, form.coating, form.printing);
  const unitPrice = material + finishing.total;

  const quantityCost = totalQuantityCost(unitPrice, form.quantity);
  const oneTime = oneTimeCostTotal(form.oneTimeCosts);
  const total = grandTotal(quantityCost, oneTime);

  return {
    boxType: form.boxType,
    ply: form.ply,
    paperCostPerKg: form.paperCostPerKg,
    quantity: form.quantity,
    sheet,
    areaM2,
    weightKg,
    gsm: PLY_GSM[form.ply],
    markup,
    material,
    coatingCost: finishing.coatingCost,
    printingCost: finishing.printingCost,
    finishing: finishing.total,
    unitPrice,
    quantityCost,
    oneTime,
    total,
    allInPerBox: form.quantity > 0 ? total / form.quantity : 0,
  };
}

// Validate the numeric inputs before quoting
export function isValidQuote(form) {
  const numeric = [form.length, form.width, form.height, form.quantity, form.paperCostPerKg];
  return numeric.every((v) => Number.isFinite(Number(v)) && Number(v) > 0);
}
