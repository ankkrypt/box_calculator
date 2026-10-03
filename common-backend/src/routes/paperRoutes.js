const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { getPaperGrades, createPaperGrade, updatePaperGrade, deletePaperGrade, bulkDeletePaperGrades, resetPaperGrades } = require("../controllers/paperGradeController");

const router = express.Router();

router.use(requireAuth);

router.get("/", getPaperGrades);
router.post("/", createPaperGrade);
router.post("/reset", resetPaperGrades);
router.post("/bulk-delete", bulkDeletePaperGrades);
router.put("/:id", updatePaperGrade);
router.delete("/:id", deletePaperGrade);

module.exports = router;
