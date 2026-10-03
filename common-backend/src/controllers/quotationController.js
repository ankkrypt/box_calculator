const Quotation = require("../models/Quotation");
const { calculateQuotation } = require("../utils/calculator");

/**
 * GET /api/quotation
 * GET /api/quotation/latest
 * Returns the quotation rates (conversion, profitMargin, tax, discount in %) for the active vendor.
 * Accessible to Vendor and Staff.
 * Never resets or overrides vendor values with defaults.
 */
async function getQuotation(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;
    if (!vendorId) {
      return res.status(400).json({ error: { message: "Vendor context missing", status: 400 } });
    }

    const quote = await Quotation.findOne({ vendorId });

    const conversion = quote ? Number(quote.conversion) : 0;
    const profitMargin = quote ? Number(quote.profitMargin) : 0;
    const tax = quote ? Number(quote.tax) : 0;
    const discount = quote ? Number(quote.discount) : 0;

    return res.json({
      quotation: {
        _id: quote?._id,
        vendorId,
        conversion,
        profitMargin,
        tax,
        discount,
        // Short aliases for frontend convenience
        conv: conversion,
        marg: profitMargin,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * PUT /api/quotation
 * Updates the quotation rates (conversion, profitMargin, tax, discount in %).
 * Vendor only.
 * Allows 0 as a completely valid intentional value.
 */
async function updateQuotation(req, res, next) {
  try {
    const vendorId = req.auth.vendorId;
    if (!vendorId) {
      return res.status(400).json({ error: { message: "Vendor context missing", status: 400 } });
    }

    const { conversion, profitMargin, tax, discount, conv, marg } = req.body;

    const convVal = conversion !== undefined ? Number(conversion) : conv !== undefined ? Number(conv) : undefined;
    const margVal = profitMargin !== undefined ? Number(profitMargin) : marg !== undefined ? Number(marg) : undefined;
    const taxVal = tax !== undefined ? Number(tax) : undefined;
    const discVal = discount !== undefined ? Number(discount) : undefined;

    const updateFields = {};
    if (convVal !== undefined && convVal >= 0) updateFields.conversion = convVal;
    if (margVal !== undefined && margVal >= 0 && margVal <= 100) updateFields.profitMargin = margVal;
    if (taxVal !== undefined && taxVal >= 0 && taxVal <= 100) updateFields.tax = taxVal;
    if (discVal !== undefined && discVal >= 0 && discVal <= 100) updateFields.discount = discVal;

    const quote = await Quotation.findOneAndUpdate(
      { vendorId },
      { $set: updateFields },
      { upsert: true, new: true, setDefaultsOnInsert: false }
    );

    return res.json({
      ok: true,
      message: "Quotation rates updated successfully",
      quotation: {
        _id: quote._id,
        vendorId: quote.vendorId,
        conversion: quote.conversion,
        profitMargin: quote.profitMargin,
        tax: quote.tax,
        discount: quote.discount,
        conv: quote.conversion,
        marg: quote.profitMargin,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/quotation/calculate
 * Computes box specifications and pricing breakdown on the fly.
 * Uses the vendor's saved quotation rates (conversion, profitMargin, tax, discount).
 * Does NOT persist order, board, or calculation outputs to Quotation collection.
 * Accessible to Vendor and Staff.
 */
async function calculateQuotationOutputs(req, res, next) {
  try {
    const { order = {}, board = {}, pricing = {} } = req.body;
    const vendorId = req.auth.vendorId;

    if (!vendorId) {
      return res.status(400).json({ error: { message: "Vendor context missing", status: 400 } });
    }

    // Read vendor locked rates from Quotation model
    const quote = await Quotation.findOne({ vendorId });

    const conv =
      pricing.conv !== undefined && pricing.conv !== null
        ? Number(pricing.conv)
        : quote?.conversion !== undefined
        ? Number(quote.conversion)
        : 0;

    const marg =
      pricing.marg !== undefined && pricing.marg !== null
        ? Number(pricing.marg)
        : quote?.profitMargin !== undefined
        ? Number(quote.profitMargin)
        : 0;

    const tax =
      pricing.tax !== undefined && pricing.tax !== null
        ? Number(pricing.tax)
        : quote?.tax !== undefined
        ? Number(quote.tax)
        : 0;

    const discount =
      pricing.discount !== undefined && pricing.discount !== null
        ? Number(pricing.discount)
        : quote?.discount !== undefined
        ? Number(quote.discount)
        : 0;

    const trans =
      pricing.trans !== undefined && pricing.trans !== null
        ? Number(pricing.trans)
        : 3500;

    const extra =
      pricing.extra !== undefined && pricing.extra !== null
        ? Number(pricing.extra)
        : board.extra !== undefined && board.extra !== null
        ? Number(board.extra)
        : 5;

    const resolvedPricing = {
      conv,
      marg,
      tax,
      discount,
      trans,
      extra,
      wastagePct: extra,
    };

    // Calculate packaging outputs
    const calculated = calculateQuotation({
      order,
      board: {
        ...board,
        extra,
      },
      pricing: resolvedPricing,
    });

    return res.json({
      ok: true,
      outputs: calculated,
      pricing: resolvedPricing,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getQuotation,
  updateQuotation,
  calculateQuotationOutputs,
  // Backward compatibility aliases
  getLatestQuotation: getQuotation,
  calculateAndSaveQuotation: calculateQuotationOutputs,
};
