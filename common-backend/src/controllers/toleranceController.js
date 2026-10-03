const ScoreTolerance = require("../models/ScoreTolerance");

const DEFAULT_TOLERANCES = {
  "3": 6,
  "5": 12,
  "7": 18,
  "9": 24,
};

/**
 * GET /api/tolerances
 * Retrieves score tolerances for the authenticated vendor company.
 * Returns empty object by default until the vendor explicitly saves or resets them.
 */
async function getTolerances(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;
    const doc = await ScoreTolerance.findOne({ vendorId });

    if (!doc || !doc.tolerances) {
      return res.json({ ok: true, tolerances: {} });
    }

    const tolObj = doc.tolerances instanceof Map
      ? Object.fromEntries(doc.tolerances)
      : doc.tolerances || {};

    return res.json({ ok: true, tolerances: tolObj });
  } catch (err) {
    return next(err);
  }
}

/**
 * PUT /api/tolerances
 * Updates score tolerances for the vendor company.
 * Accessible to both Vendor and Staff.
 */
async function updateTolerances(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;
    const { tolerances } = req.body;

    if (!tolerances || typeof tolerances !== "object") {
      return res.status(400).json({
        error: { message: "Invalid tolerances object", status: 400 },
      });
    }

    const doc = await ScoreTolerance.findOneAndUpdate(
      { vendorId },
      {
        $set: {
          tolerances,
          updatedBy: req.auth.userId,
          updatedByType: req.auth.role,
        },
      },
      { new: true, upsert: true }
    );

    const tolObj = doc.tolerances instanceof Map
      ? Object.fromEntries(doc.tolerances)
      : doc.tolerances;

    return res.json({ ok: true, tolerances: tolObj });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/tolerances/reset
 * Resets score tolerances to industry standard defaults.
 */
async function resetTolerances(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;

    const doc = await ScoreTolerance.findOneAndUpdate(
      { vendorId },
      {
        $set: {
          tolerances: DEFAULT_TOLERANCES,
          updatedBy: req.auth.userId,
          updatedByType: req.auth.role,
        },
      },
      { new: true, upsert: true }
    );

    const tolObj = doc.tolerances instanceof Map
      ? Object.fromEntries(doc.tolerances)
      : doc.tolerances;

    return res.json({ ok: true, tolerances: tolObj });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  DEFAULT_TOLERANCES,
  getTolerances,
  updateTolerances,
  resetTolerances,
};
