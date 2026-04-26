/* ================================================================
   GaIA Gamification Service / Servicio de Gamificación
   ES: Gestión de rachas, monedas y logros por usuario.
       Datos persistidos en data/gamification.json.
   EN: Manages streaks, coins and achievements per user.
       Data persisted in data/gamification.json.
   ================================================================ */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dataDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../data"
);
const gamifFile = path.join(dataDir, "gamification.json");

// ── Definición de logros ──────────────────────────────────────────────────────
export const ACHIEVEMENTS = [
  { id: "first_chat",  label: "Primera Aventura", emoji: "🌟", desc: "Enviaste tu primer mensaje",  target: 1,   metric: "messages" },
  { id: "chat_10",     label: "Curioso",           emoji: "🔭", desc: "Enviaste 10 mensajes",        target: 10,  metric: "messages" },
  { id: "chat_50",     label: "Explorador",        emoji: "🗺️", desc: "Enviaste 50 mensajes",        target: 50,  metric: "messages" },
  { id: "chat_100",    label: "Sabio",              emoji: "🦉", desc: "Enviaste 100 mensajes",       target: 100, metric: "messages" },
  { id: "streak_3",   label: "Constante",          emoji: "🔥", desc: "3 días seguidos",             target: 3,   metric: "streak"   },
  { id: "streak_7",   label: "Imparable",          emoji: "⚡", desc: "7 días seguidos",             target: 7,   metric: "streak"   },
  { id: "streak_30",  label: "Leyenda",             emoji: "👑", desc: "30 días seguidos",            target: 30,  metric: "streak"   },
  { id: "vocab_5",    label: "Coleccionista",       emoji: "📖", desc: "Guardaste 5 palabras",        target: 5,   metric: "vocab"    },
  { id: "vocab_20",   label: "Diccionario",         emoji: "📚", desc: "Guardaste 20 palabras",       target: 20,  metric: "vocab"    },
  { id: "coins_100",  label: "Rico en Saber",       emoji: "💰", desc: "Acumulaste 100 monedas",      target: 100, metric: "coins"    },
  { id: "coins_500",  label: "Tesoro",              emoji: "🏆", desc: "Acumulaste 500 monedas",      target: 500, metric: "coins"    },
];

// ── Persistencia ───────────────────────────────────────────────────────────────
function loadData() {
  try {
    if (fs.existsSync(gamifFile)) {
      return JSON.parse(fs.readFileSync(gamifFile, "utf8"));
    }
  } catch { /* corrupted → start fresh */ }
  return {};
}

function saveData(data) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(gamifFile, JSON.stringify(data, null, 2), "utf8");
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getOrCreateUser(data, userId) {
  if (!data[userId]) {
    data[userId] = {
      userId,
      coins: 0,
      totalMessages: 0,
      vocabCount: 0,
      streak: 0,
      lastStreakDate: null,
      unlockedAchievements: [],
      createdAt: new Date().toISOString(),
    };
  }
  return data[userId];
}

function checkNewAchievements(user) {
  const newUnlocked = [];
  for (const ach of ACHIEVEMENTS) {
    if (user.unlockedAchievements.includes(ach.id)) continue;
    let value = 0;
    if (ach.metric === "messages") value = user.totalMessages;
    else if (ach.metric === "streak")  value = user.streak;
    else if (ach.metric === "vocab")   value = user.vocabCount;
    else if (ach.metric === "coins")   value = user.coins;
    if (value >= ach.target) {
      user.unlockedAchievements.push(ach.id);
      newUnlocked.push(ach);
    }
  }
  return newUnlocked;
}

function withAchievements(user) {
  return {
    ...user,
    achievements: ACHIEVEMENTS.map((ach) => ({
      ...ach,
      unlocked: user.unlockedAchievements.includes(ach.id),
    })),
  };
}

// ── API pública ────────────────────────────────────────────────────────────────

/** ES: Obtiene el estado de gamificación de un usuario (crea si no existe).
    EN: Gets a user's gamification state (creates if missing). */
export function getUserGamification(userId) {
  const data = loadData();
  const user = getOrCreateUser(data, userId);
  saveData(data);
  return withAchievements(user);
}

/** ES: Registra un mensaje del usuario: +2 monedas, actualiza racha.
    EN: Records a user message: +2 coins, updates streak. */
export function recordMessage(userId) {
  const data = loadData();
  const user = getOrCreateUser(data, userId);

  user.totalMessages = (user.totalMessages || 0) + 1;
  user.coins = (user.coins || 0) + 2;

  // ES: Racha diaria — un incremento por día como máximo
  // EN: Daily streak — one increment per day at most
  const today = new Date().toDateString();
  if (user.lastStreakDate !== today) {
    const yesterday = new Date(Date.now() - 86_400_000).toDateString();
    if (user.lastStreakDate === yesterday) {
      user.streak = (user.streak || 0) + 1;
    } else {
      user.streak = 1; // ES: racha rota / EN: streak broken
    }
    user.lastStreakDate = today;
  }

  const newAchievements = checkNewAchievements(user);
  saveData(data);
  return { user: withAchievements(user), newAchievements };
}

/** ES: Registra una palabra de vocabulario guardada: +5 monedas.
    EN: Records a saved vocabulary word: +5 coins. */
export function recordVocabSaved(userId) {
  const data = loadData();
  const user = getOrCreateUser(data, userId);

  user.vocabCount = (user.vocabCount || 0) + 1;
  user.coins = (user.coins || 0) + 5;

  const newAchievements = checkNewAchievements(user);
  saveData(data);
  return { user: withAchievements(user), newAchievements };
}

/** ES: Devuelve las estadísticas parentales resumidas.
    EN: Returns summarised parental stats. */
export function getParentalStats(userId) {
  const data = loadData();
  const user = data[userId];
  if (!user) return null;
  return {
    totalMessages: user.totalMessages || 0,
    streak: user.streak || 0,
    coins: user.coins || 0,
    vocabCount: user.vocabCount || 0,
    achievementsUnlocked: user.unlockedAchievements?.length || 0,
    totalAchievements: ACHIEVEMENTS.length,
    lastActive: user.lastStreakDate || null,
  };
}
