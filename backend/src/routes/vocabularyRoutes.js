import { Router } from "express";
import { getVocab, addWord, deleteWord } from "../controllers/vocabularyController.js";

const router = Router();

// GET    /api/vocabulary/:userId                  → lista de palabras
// POST   /api/vocabulary/:userId/words            → añadir palabra { word, definition, context }
// DELETE /api/vocabulary/:userId/words/:wordId    → eliminar palabra
router.get(   "/vocabulary/:userId",               getVocab);
router.post(  "/vocabulary/:userId/words",         addWord);
router.delete("/vocabulary/:userId/words/:wordId", deleteWord);

export default router;
