/* ================================================================
   GaIA Credits Service / Servicio de Créditos
   ES: Gestiona el sistema de créditos diarios por usuario.
       Cada día se reinician a DAILY_FREE_CREDITS (defecto: 25).
       Los datos se persisten en JSON para sobrevivir reinicios.
   EN: Manages the daily-credits system per user.
       Credits reset every day to DAILY_FREE_CREDITS (default: 25).
       Data is persisted to JSON to survive restarts.
   ================================================================ */

import fs from "node:fs";
import path from "node:path";
import { creditsStoreFilePath, dailyFreeCredits } from "../config/env.js";

// ES: Mapa en memoria: userId → { dayKey, remaining }
// EN: In-memory map: userId → { dayKey, remaining }
const creditsStore = new Map(loadStoreFromDisk());

// ES: Carga los créditos persistidos del disco al arrancar el servidor.
//     Si el archivo no existe o está corrupto, empieza vacío.
// EN: Loads persisted credits from disk when the server starts.
//     Starts empty if the file is missing or corrupted.
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

    // ES: Validar y filtrar entradas con la forma correcta
    // EN: Validate and filter entries with the correct shape
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

// ES: Guarda el mapa de créditos en disco de forma síncrona.
//     Se llama después de cada gasto o recarga de créditos.
// EN: Saves the credits map to disk synchronously.
//     Called after every credit spend or refund.
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

// ES: Genera la clave de día (YYYY-M-D) para detectar el reinicio diario.
// EN: Generates the day key (YYYY-M-D) to detect the daily reset.
function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

// ES: Devuelve los créditos actuales del usuario.
//     Si es un día nuevo (o el usuario es nuevo), reinicia el contador.
// EN: Returns the current credits for a user.
//     Resets the counter if it is a new day (or a new user).
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

// ES: Descuenta `amount` créditos del usuario.
//     Devuelve false si no tiene suficientes (no descuenta nada).
// EN: Deducts `amount` credits from the user.
//     Returns false if insufficient credits (nothing deducted).
function spendCredit(userId, amount) {
  // Créditos ilimitados mientras se entrena la IA
  return true;
}

// ES: Devuelve `amount` créditos al usuario (reembolso por error).
//     No supera el máximo diario para evitar abusos.
// EN: Returns `amount` credits to the user (refund on error).
//     Does not exceed the daily maximum to prevent abuse.
function refundCredit(userId, amount) {
  const current = getUserCredits(userId);
  const updated = current.remaining + amount;
  current.remaining = updated > dailyFreeCredits ? dailyFreeCredits : updated;
  persistStore();
}

export { getUserCredits, spendCredit, refundCredit };