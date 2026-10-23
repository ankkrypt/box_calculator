const express = require("express");
const { requireAuth, requirePermission } = require("../middleware/auth");
const { getPaperGrades, createPaperGrade, updatePaperGrade, deletePaperGrade, bulkDeletePaperGrades, resetPaperGrades } = require("../controllers/paperGradeController");

const router = express.Router();

router.use(requireAuth);

router.get("/", requirePermission("paper", "read"), getPaperGrades);
router.post("/", requirePermission("paper", "create"), createPaperGrade);
router.post("/reset", requirePermission("paper", "create"), resetPaperGrades);
router.post("/bulk-delete", requirePermission("paper", "delete"), bulkDeletePaperGrades);
router.put("/:id", requirePermission("paper", "update"), updatePaperGrade);
router.delete("/:id", requirePermission("paper", "delete"), deletePaperGrade);

module.exports = router;
