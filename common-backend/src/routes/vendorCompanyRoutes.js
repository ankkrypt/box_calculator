const express = require("express");
const router = express.Router();
const vendorCompanyController = require("../controllers/vendorCompanyController");
const { requireAuth, requirePermission } = require("../middleware/auth");

/* GET /api/vendor-company
   List all companies the authenticated user can access. */
router.get("/", requireAuth, requirePermission("vendorCompany", "read"), vendorCompanyController.getAll);

/* GET /api/vendor-company/me
   Return the authenticated user's company details. */
router.get("/me", requireAuth, requirePermission("vendorCompany", "read"), vendorCompanyController.getMe);

/* GET /api/vendor-company/:id
   Get a single company by ID. */
router.get("/:id", requireAuth, requirePermission("vendorCompany", "read"), vendorCompanyController.getById);

/* POST /api/vendor-company
   Create a new vendor company (vendor only). */
router.post("/", requireAuth, requirePermission("vendorCompany", "create"), vendorCompanyController.create);

/* PUT /api/vendor-company/me
   Update the authenticated vendor's company details. */
router.put("/me", requireAuth, requirePermission("vendorCompany", "update"), vendorCompanyController.updateMe);

/* PUT /api/vendor-company/:id
   Update an existing company (vendor only, or staff with update permission). */
router.put("/:id", requireAuth, requirePermission("vendorCompany", "update"), vendorCompanyController.update);

/* DELETE /api/vendor-company/:id
   Delete a company (vendor only). */
router.delete("/:id", requireAuth, requirePermission("vendorCompany", "delete"), vendorCompanyController.remove);

module.exports = router;
