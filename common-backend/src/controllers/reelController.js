const Reel = require("../models/Reel");

/**
 * GET /api/reels
 * Retrieves all paper reels for the authenticated vendor (or staff's vendor).
 * Returns empty array by default if no reels have been added by the vendor/staff.
 */
async function getReels(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;
    const reels = await Reel.find({ vendorId }).sort({ w: 1 });
    return res.json({ ok: true, reels });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/reels
 * Adds a new reel to the vendor's inventory.
 */
async function createReel(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;
    const { w, gsm, bf, price, stock, shade, paperGrade, flute } = req.body;

    if (!w || !gsm || !bf || price === undefined || price === null) {
      return res.status(400).json({
        error: { message: "Width, GSM, BF, and Price are required", status: 400 },
      });
    }

    const reel = await Reel.create({
      vendorId,
      w: Number(w),
      gsm: Number(gsm),
      bf: Number(bf),
      price: Number(price),
      stock: Number(stock) || 0,
      shade: shade?.trim() || "Natural Kraft",
      paperGrade: paperGrade?.trim() || "",
      flute: flute?.trim() || "",
      createdBy: req.auth.userId,
      createdByType: req.auth.role,
    });

    return res.status(201).json({ ok: true, reel });
  } catch (err) {
    return next(err);
  }
}

/**
 * PUT /api/reels/:id
 * Updates an existing reel.
 */
async function updateReel(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;
    const { id } = req.params;
    const { w, gsm, bf, price, stock, shade, paperGrade, flute } = req.body;

    const updates = {};
    if (w !== undefined) updates.w = Number(w);
    if (gsm !== undefined) updates.gsm = Number(gsm);
    if (bf !== undefined) updates.bf = Number(bf);
    if (price !== undefined) updates.price = Number(price);
    if (stock !== undefined) updates.stock = Number(stock);
    if (shade !== undefined) updates.shade = shade.trim();
    if (paperGrade !== undefined) updates.paperGrade = paperGrade.trim();
    if (flute !== undefined) updates.flute = flute.trim();

    const reel = await Reel.findOneAndUpdate(
      { _id: id, vendorId },
      { $set: updates },
      { new: true }
    );

    if (!reel) {
      return res.status(404).json({
        error: { message: "Reel not found or unauthorized", status: 404 },
      });
    }

    return res.json({ ok: true, reel });
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/reels/:id
 * Deletes a single reel.
 */
async function deleteReel(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;
    const { id } = req.params;

    const deleted = await Reel.findOneAndDelete({ _id: id, vendorId });
    if (!deleted) {
      return res.status(404).json({
        error: { message: "Reel not found or unauthorized", status: 404 },
      });
    }

    return res.json({ ok: true, deletedId: id });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/reels/bulk-delete
 * Bulk deletes multiple selected reels.
 */
async function bulkDeleteReels(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: { message: "List of reel IDs is required", status: 400 },
      });
    }

    const result = await Reel.deleteMany({
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

module.exports = {
  getReels,
  createReel,
  updateReel,
  deleteReel,
  bulkDeleteReels,
};
