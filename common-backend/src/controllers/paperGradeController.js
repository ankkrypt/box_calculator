const PaperGrade = require("../models/PaperGrade");

const DEFAULT_PAPER_GRADES = [
  { name: "Virgin Kraft", gsm: 180, bf: 28, price: 44, flute: "B", takeUp: 1.32 },
  { name: "Semi-Kraft", gsm: 150, bf: 24, price: 38, flute: "B", takeUp: 1.32 },
  { name: "Test Liner", gsm: 120, bf: 18, price: 34, flute: "B", takeUp: 1.32 },
];

/**
 * GET /api/papers
 */
async function getPaperGrades(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;
    const papers = await PaperGrade.find({ vendorId }).sort({ gsm: -1 });
    return res.json({ ok: true, papers });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/papers
 */
async function createPaperGrade(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;
    const { name, gsm, bf, price, flute, takeUp } = req.body;

    if (!name || !gsm || !bf) {
      return res.status(400).json({
        error: { message: "Fields (name, gsm, bf) are required", status: 400 },
      });
    }

    const paper = await PaperGrade.create({
      vendorId,
      name: name.trim(),
      gsm: Number(gsm),
      bf: Number(bf),
      price: price !== undefined && price !== null && price !== "" ? Number(price) : 0,
      flute: flute ? flute.trim() : "B",
      takeUp: takeUp !== undefined && takeUp !== null && takeUp !== "" ? Number(takeUp) : 1.32,
      createdBy: req.auth.userId,
      createdByType: req.auth.role,
    });

    return res.status(201).json({ ok: true, paper });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        error: { message: `Paper grade "${req.body.name}" already exists`, status: 400 },
      });
    }
    return next(err);
  }
}

/**
 * PUT /api/papers/:id
 */
async function updatePaperGrade(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;
    const { id } = req.params;
    const { name, gsm, bf, price, flute, takeUp } = req.body;

    const updates = {};
    if (name) updates.name = name.trim();
    if (gsm !== undefined) updates.gsm = Number(gsm);
    if (bf !== undefined) updates.bf = Number(bf);
    if (price !== undefined) updates.price = price !== "" && !isNaN(Number(price)) ? Number(price) : 0;
    if (flute !== undefined) updates.flute = flute.trim();
    if (takeUp !== undefined) updates.takeUp = takeUp !== "" && !isNaN(Number(takeUp)) ? Number(takeUp) : 1.32;

    const paper = await PaperGrade.findOneAndUpdate(
      { _id: id, vendorId },
      { $set: updates },
      { new: true }
    );

    if (!paper) {
      return res.status(404).json({
        error: { message: "Paper grade not found or unauthorized", status: 404 },
      });
    }

    return res.json({ ok: true, paper });
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/papers/:id
 */
async function deletePaperGrade(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;
    const { id } = req.params;

    const deleted = await PaperGrade.findOneAndDelete({ _id: id, vendorId });
    if (!deleted) {
      return res.status(404).json({
        error: { message: "Paper grade not found or unauthorized", status: 404 },
      });
    }

    return res.json({ ok: true, deletedId: id });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/papers/bulk-delete
 */
async function bulkDeletePaperGrades(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: { message: "List of paper IDs is required", status: 400 },
      });
    }

    const result = await PaperGrade.deleteMany({
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
 * POST /api/papers/reset
 */
async function resetPaperGrades(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;

    await PaperGrade.deleteMany({ vendorId });

    const toInsert = DEFAULT_PAPER_GRADES.map((p) => ({
      ...p,
      vendorId,
      createdBy: req.auth.userId,
      createdByType: req.auth.role,
    }));

    const papers = await PaperGrade.insertMany(toInsert);

    return res.json({ ok: true, papers });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  DEFAULT_PAPER_GRADES,
  getPaperGrades,
  createPaperGrade,
  updatePaperGrade,
  deletePaperGrade,
  bulkDeletePaperGrades,
  resetPaperGrades,
};
