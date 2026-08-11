// Registry of supported box styles.
//
// Each box style knows how to unfold the finished box dimensions into the
// flat corrugated sheet that gets cut. Everything downstream of this
// (area -> weight -> cost) is shared by every box style.
//
// To add a new box style later (shoebox, pizza, custom...), add an entry
// here that implements `sheetDimensions`. Nothing else needs to change.

export const BOX_TYPES = {
  rsc: {
    id: "rsc",
    label: "Regular Slotted Carton",
    shortLabel: "RSC",
    description: "Standard 4-flap corrugated shipping box",
    status: "available",

    // Step 1 of the algorithm — flat sheet size in mm for one box.
    //   sheet length = 2*L + 2*W + joint allowance
    //   sheet width  = H + W + trim allowance  (the two flaps are each half the width)
    sheetDimensions: ({ length, width, height, jointAllowance, trimAllowance }) => ({
      sheetLength: 2 * length + 2 * width + jointAllowance,
      sheetWidth: height + width + trimAllowance,
    }),
  },

  // Placeholders so the UI can advertise what is coming. Implement
  // `sheetDimensions` on each when the formula is worked out.
  shoebox: {
    id: "shoebox",
    label: "Shoebox",
    shortLabel: "Shoebox",
    description: "Two-piece lid & base set",
    status: "coming-soon",
  },
  pizza: {
    id: "pizza",
    label: "Pizza box",
    shortLabel: "Pizza",
    description: "Single-piece foldable pizza box",
    status: "coming-soon",
  },
  custom: {
    id: "custom",
    label: "Custom",
    shortLabel: "Custom",
    description: "Bring your own design",
    status: "coming-soon",
  },
};

export const DEFAULT_BOX_TYPE = "rsc";
