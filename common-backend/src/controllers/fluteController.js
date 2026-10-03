const Flute = require("../models/Flute");

const DEFAULT_FLUTES = [
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

/**
 * GET /api/flutes
 * Retrieves all flute types for the authenticated vendor company.
 * Returns empty array by default until the vendor explicitly adds or resets them.
 */
async function getFlutes(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;
    const flutes = await Flute.find({ vendorId }).sort({ f: -1 });
    return res.json({ ok: true, flutes });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/flutes
 * Adds a new flute to the vendor's profile.
 */
async function createFlute(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;
    const { n, f, th, d } = req.body;

    if (!n || !f) {
      return res.status(400).json({
        error: { message: "Flute name and take-up factor are required", status: 400 },
      });
    }

    const flute = await Flute.create({
      vendorId,
      n: n.trim().toUpperCase(),
      f: Number(f),
      th: th?.trim() || "",
      d: d?.trim() || "",
      createdBy: req.auth.userId,
      createdByType: req.auth.role,
    });

    return res.status(201).json({ ok: true, flute });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        error: { message: `Flute "${req.body.n}" already exists in your table`, status: 400 },
      });
    }
    return next(err);
  }
}

/**
 * PUT /api/flutes/:id
 * Updates an existing flute.
 */
async function updateFlute(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;
    const { id } = req.params;
    const { n, f, th, d } = req.body;

    const updates = {};
    if (n) updates.n = n.trim().toUpperCase();
    if (f !== undefined) updates.f = Number(f);
    if (th !== undefined) updates.th = th.trim();
    if (d !== undefined) updates.d = d.trim();

    const flute = await Flute.findOneAndUpdate(
      { _id: id, vendorId },
      { $set: updates },
      { new: true }
    );

    if (!flute) {
      return res.status(404).json({
        error: { message: "Flute not found or unauthorized", status: 404 },
      });
    }

    return res.json({ ok: true, flute });
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/flutes/:id
 * Deletes a single flute.
 */
async function deleteFlute(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;
    const { id } = req.params;

    const deleted = await Flute.findOneAndDelete({ _id: id, vendorId });
    if (!deleted) {
      return res.status(404).json({
        error: { message: "Flute not found or unauthorized", status: 404 },
      });
    }

    return res.json({ ok: true, deletedId: id });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/flutes/bulk-delete
 * Bulk deletes multiple selected flutes.
 */
async function bulkDeleteFlutes(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: { message: "List of flute IDs is required", status: 400 },
      });
    }

    const result = await Flute.deleteMany({
      _id: { $in: ids },
      vendorId,
    });

    return res.json({
      ok: true,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/flutes/reset
 * Resets the vendor's flute table to the standard industry defaults.
 */
async function resetFlutes(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;

    await Flute.deleteMany({ vendorId });

    const toInsert = DEFAULT_FLUTES.map((f) => ({
      ...f,
      vendorId,
      createdBy: req.auth.userId,
      createdByType: req.auth.role,
    }));

    const flutes = await Flute.insertMany(toInsert);

    return res.json({ ok: true, flutes });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  DEFAULT_FLUTES,
  getFlutes,
  createFlute,
  updateFlute,
  deleteFlute,
  bulkDeleteFlutes,
  resetFlutes,
};
