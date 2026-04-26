/* ================================================================
   GaIA Gamification Controller
   ================================================================ */

import {
  getUserGamification,
  recordMessage,
  getParentalStats,
} from "../services/gamificationService.js";

export async function getGamification(req, res) {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: "userId required" });
  try {
    res.json(getUserGamification(userId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function postMessage(req, res) {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: "userId required" });
  try {
    res.json(recordMessage(userId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function parentalStats(req, res) {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: "userId required" });
  try {
    const stats = getParentalStats(userId);
    if (!stats) return res.status(404).json({ error: "No data found" });
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
