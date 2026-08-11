// Central configuration for the box calculator.
// All rates, ranges and markups live here so they can be tuned
// without touching the UI or the calculation logic.

// Corrugated board ply -> grams per square metre (GSM)
export const PLY_GSM = {
  3: 350,
  5: 600,
  7: 900,
  9: 1200,
};

// Paper colour -> price per kg in INR [min, max] with a sensible default
export const PAPER_COSTS = {
  brown: { label: "Brown (Kraft)", min: 30, max: 55, default: 40 },
  white: { label: "White (Bleached)", min: 85, max: 95, default: 90 },
};

// Board cutting allowances in mm (used in step 1 of the algorithm)
export const ALLOWANCES = {
  joint: { label: "Joint allowance", min: 30, max: 50, default: 40 },
  trim: { label: "Trim allowance", min: 10, max: 20, default: 15 },
};

// Quantity -> markup multiplier tiers. First tier where qty <= max wins.
export const MARKUP_TIERS = [
  { label: "Up to 10", max: 10, markup: 1.5 },
  { label: "11–50", max: 50, markup: 1.4 },
  { label: "51–100", max: 100, markup: 1.3 },
  { label: "101–200", max: 200, markup: 1.2 },
  { label: "201–500", max: 500, markup: 1.1 },
  { label: "500+", max: Infinity, markup: 1.0 },
];

// Quick quantity presets shown in the UI
export const QUANTITY_PRESETS = [10, 50, 100, 200, 500];

// Surface finishing options -> cost per square metre in INR
export const COATINGS = [
  { id: "none", label: "No coating", ratePerSqm: 0 },
  { id: "aqueous", label: "Aqueous coating", ratePerSqm: 5 },
  { id: "uv", label: "UV coating", ratePerSqm: 8 },
  { id: "matte", label: "Matte lamination", ratePerSqm: 10 },
  { id: "gloss", label: "Gloss lamination", ratePerSqm: 10 },
];

// Printing options -> cost per box in INR (ink + print)
export const PRINTING_OPTIONS = [
  { id: "none", label: "No printing", ratePerBox: 0 },
  { id: "single", label: "1-colour print", ratePerBox: 1 },
  { id: "two", label: "2-colour print", ratePerBox: 2 },
  { id: "multi", label: "Multi-colour print", ratePerBox: 3 },
];

// One-time set-up costs charged once per order (INR)
export const ONE_TIME_COST_FIELDS = [
  { id: "logoStamp", label: "Logo stamps", hint: "Plate / stamping charge" },
  { id: "dieMold", label: "Die cutting mold", hint: "Custom die for your size" },
  { id: "labour", label: "Labour", hint: "Set-up & handling" },
  { id: "machineSetup", label: "Machine set-up", hint: "Per production run" },
];
