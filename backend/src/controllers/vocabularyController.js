/* ================================================================
   GaIA Vocabulary Controller
   ================================================================ */

import {
  getUserVocab,
  addVocabWord,
  removeVocabWord,
} from "../services/vocabularyService.js";
import { recordVocabSaved } from "../services/gamificationService.js";

export async function getVocab(req, res) {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: "userId required" });
  res.json(getUserVocab(userId));
}

export async function addWord(req, res) {
  const { userId } = req.params;
  const { word, definition, context } = req.body || {};
  if (!userId || !word?.trim()) {
    return res.status(400).json({ error: "userId and word are required" });
  }
  const result = addVocabWord(userId, word.trim(), definition || "", context || "");
  if (result.added) {
    try { recordVocabSaved(userId); } catch { /* gamification is optional */ }
  }
  res.json(result);
}

export async function deleteWord(req, res) {
  const { userId, wordId } = req.params;
  if (!userId || !wordId) {
    return res.status(400).json({ error: "userId and wordId are required" });
  }
  res.json({ words: removeVocabWord(userId, wordId) });
}
