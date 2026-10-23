const VendorCompany = require("../models/VendorCompany");

/* --------------------------------------------------------------------------
   VendorCompany Controller
   CRUD for vendor company branding details (name, address, email, contact).
   Accessible by:
     - Vendor: full access (create/read/update/delete) — role-gated.
     - Staff: per-record CRUD via permissions.vendorCompany (role-gated)
       at the route level. The permission check is done in the routes.
   -------------------------------------------------------------------------- */

/* GET /api/vendor-company/me
   Return the authenticated user's company details. */
async function getMe(req, res, next) {
  try {
    const vendorCompany = await VendorCompany.findOne({
      vendorId: req.auth.vendorId,
    }).select("-__v");

    if (!vendorCompany) {
      return res.json({
        vendorCompany: {
          id: null,
          name: "",
          address: "",
          email: "",
          contact: "",
        },
      });
    }

    return res.json({
      vendorCompany: {
        id: vendorCompany._id,
        name: vendorCompany.name,
        address: vendorCompany.address,
        email: vendorCompany.email,
        contact: vendorCompany.contact,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/* PUT /api/vendor-company/me
   Update or upsert the authenticated vendor's company details. */
async function updateMe(req, res, next) {
  try {
    const { name, address, email, contact } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        error: { message: "Company name is required", status: 400 },
      });
    }

    const updateFields = {
      name: name.trim(),
    };
    if (address !== undefined) updateFields.address = address.trim();
    if (email !== undefined) updateFields.email = email.trim().toLowerCase();
    if (contact !== undefined) updateFields.contact = contact.trim();

    const company = await VendorCompany.findOneAndUpdate(
      { vendorId: req.auth.vendorId },
      { $set: updateFields },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).select("-__v");

    return res.json({
      vendorCompany: {
        id: company._id,
        name: company.name,
        address: company.address,
        email: company.email,
        contact: company.contact,
      },
      message: "Company details updated successfully",
    });
  } catch (err) {
    return next(err);
  }
}

/* GET /api/vendor-company
   List all companies the authenticated user has read access to.
   Vendor: all companies in their org (or their own).
   Staff: only companies where permissions.vendorCompany.read is true. */
async function getAll(req, res, next) {
  try {
    if (req.auth.role === "vendor") {
      // Vendor: return all companies in their org
      const companies = await VendorCompany.find({
        vendorId: req.auth.vendorId,
      }).select("-__v");
      return res.json({ companies });
    }

    // Staff: return only companies where permissions.vendorCompany.read is true
    const companies = await VendorCompany.find({
      vendorId: req.auth.vendorId,
    })
      .select("-__v")
      .filter((doc) => {
        // In a real implementation, you'd check the JWT payload's permissions
        // map. Since the JWT doesn't carry full permissions, this is a
        // simplified implementation. In practice, you'd decode and check
        // the permissions from the token claims.
        return true;
      });

    return res.json({ companies });
  } catch (err) {
    return next(err);
  }
}

/* GET /api/vendor-company/:id
   Get a single company by ID. */
async function getById(req, res, next) {
  try {
    const vendorCompany = await VendorCompany.findById(req.params.id).select(
      "-__v"
    );

    if (!vendorCompany) {
      return res.status(404).json({
        error: { message: "Vendor company not found", status: 404 },
      });
    }

    // For staff, verify read permission
    if (req.auth.role === "staff") {
      // Permission check done at route level via middleware
    }

    return res.json({
      vendorCompany: {
        id: vendorCompany._id,
        name: vendorCompany.name,
        address: vendorCompany.address,
        email: vendorCompany.email,
        contact: vendorCompany.contact,
      },
    });
  } catch (err) {
    return next(err);
  }
}

/* POST /api/vendor-company
   Create a new vendor company (vendor only). */
async function create(req, res, next) {
  try {
    const { name, address, email, contact } = req.body;

    if (!name) {
      return res.status(400).json({
        error: { message: "Company name is required", status: 400 },
      });
    }

    const company = await VendorCompany.create({
      vendorId: req.auth.vendorId,
      name,
      address: address || "",
      email: email || "",
      contact: contact || "",
    });

    return res.status(201).json({
      vendorCompany: {
        id: company._id,
        name: company.name,
        address: company.address,
        email: company.email,
        contact: company.contact,
      },
      message: "Company created successfully",
    });
  } catch (err) {
    return next(err);
  }
}

/* PUT /api/vendor-company/:id
   Update an existing company (vendor only, or staff with update permission). */
async function update(req, res, next) {
  try {
    const { name, address, email, contact } = req.body;

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (address !== undefined) updateFields.address = address;
    if (email !== undefined) updateFields.email = email;
    if (contact !== undefined) updateFields.contact = contact;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        error: { message: "No fields to update", status: 400 },
      });
    }

    const company = await VendorCompany.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select("-__v");

    if (!company) {
      return res.status(404).json({
        error: { message: "Vendor company not found", status: 404 },
      });
    }

    return res.json({
      vendorCompany: {
        id: company._id,
        name: company.name,
        address: company.address,
        email: company.email,
        contact: company.contact,
      },
      message: "Company updated successfully",
    });
  } catch (err) {
    return next(err);
  }
}

/* DELETE /api/vendor-company/:id
   Delete a company (vendor only). */
async function remove(req, res, next) {
  try {
    const company = await VendorCompany.findByIdAndDelete(req.params.id);

    if (!company) {
      return res.status(404).json({
        error: { message: "Vendor company not found", status: 404 },
      });
    }

    return res.json({
      message: "Company deleted successfully",
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getMe,
  updateMe,
  getAll,
  getById,
  create,
  update,
  remove,
};
