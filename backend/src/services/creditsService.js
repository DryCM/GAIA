import { dailyFreeCredits } from "../config/env.js";

const creditsStore = new Map();

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function getUserCredits(userId) {
  const key = userId || "anon";
  const today = getTodayKey();
  const current = creditsStore.get(key);

  if (!current || current.dayKey !== today) {
    const reset = { dayKey: today, remaining: dailyFreeCredits };
    creditsStore.set(key, reset);
    return reset;
  }

  return current;
}

function spendCredit(userId, amount) {
  const current = getUserCredits(userId);
  if (current.remaining < amount) {
    return false;
  }

  current.remaining -= amount;
  return true;
}

function refundCredit(userId, amount) {
  const current = getUserCredits(userId);
  const updated = current.remaining + amount;
  current.remaining = updated > dailyFreeCredits ? dailyFreeCredits : updated;
}

export { getUserCredits, spendCredit, refundCredit };