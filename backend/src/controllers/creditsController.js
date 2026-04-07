import { dailyFreeCredits } from "../config/env.js";
import { getUserCredits } from "../services/creditsService.js";

function getCredits(req, res) {
  const userId = String(req.query.userId || "anon");
  const current = getUserCredits(userId);

  return res.json({
    userId,
    remaining: current.remaining,
    dailyFreeCredits,
  });
}

export { getCredits };