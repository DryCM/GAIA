import fs from "node:fs";
import path from "node:path";
import { creditsStoreFilePath, dailyFreeCredits } from "../config/env.js";

const creditsStore = new Map(loadStoreFromDisk());

function loadStoreFromDisk() {
  try {
    if (!fs.existsSync(creditsStoreFilePath)) {
      return [];
    }

    const raw = fs.readFileSync(creditsStoreFilePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return [];
    }

    return Object.entries(parsed)
      .filter((entry) => {
        const value = entry[1];
        return (
          value &&
          typeof value === "object" &&
          typeof value.dayKey === "string" &&
          typeof value.remaining === "number"
        );
      })
      .map(([key, value]) => [key, { dayKey: value.dayKey, remaining: value.remaining }]);
  } catch (error) {
    console.warn(`No se pudo leer creditos persistidos: ${error instanceof Error ? error.message : "error"}`);
    return [];
  }
}

function persistStore() {
  try {
    const dir = path.dirname(creditsStoreFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const serialized = JSON.stringify(Object.fromEntries(creditsStore.entries()), null, 2);
    fs.writeFileSync(creditsStoreFilePath, serialized, "utf8");
  } catch (error) {
    console.warn(`No se pudo guardar creditos: ${error instanceof Error ? error.message : "error"}`);
  }
}

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
    persistStore();
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
  persistStore();
  return true;
}

function refundCredit(userId, amount) {
  const current = getUserCredits(userId);
  const updated = current.remaining + amount;
  current.remaining = updated > dailyFreeCredits ? dailyFreeCredits : updated;
  persistStore();
}

export { getUserCredits, spendCredit, refundCredit };