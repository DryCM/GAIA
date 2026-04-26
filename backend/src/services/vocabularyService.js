/* ================================================================
   GaIA Vocabulary Service / Servicio de Vocabulario
   ES: Guarda palabras/conceptos que el niño aprende durante el chat.
       Datos persistidos en data/vocabulary.json.
   EN: Saves words/concepts the child learns during chat.
       Data persisted in data/vocabulary.json.
   ================================================================ */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dataDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../data"
);
const vocabFile = path.join(dataDir, "vocabulary.json");

const MAX_WORDS_PER_USER = 200;

function loadData() {
  try {
    if (fs.existsSync(vocabFile)) {
      return JSON.parse(fs.readFileSync(vocabFile, "utf8"));
    }
  } catch { /* corrupted */ }
  return {};
}

function saveData(data) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(vocabFile, JSON.stringify(data, null, 2), "utf8");
}

/** ES: Obtiene todas las palabras del usuario.
    EN: Gets all words for the user. */
export function getUserVocab(userId) {
  const data = loadData();
  return data[userId] || [];
}

/** ES: Añade una palabra al vocabulario. Devuelve { added, words }.
    EN: Adds a word to vocabulary. Returns { added, words }. */
export function addVocabWord(userId, word, definition = "", context = "") {
  const data = loadData();
  if (!data[userId]) data[userId] = [];

  const normalized = word.trim().toLowerCase();
  if (data[userId].some((w) => w.word.toLowerCase() === normalized)) {
    return { added: false, words: data[userId] };
  }

  data[userId].unshift({
    id: `v_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    word: word.trim(),
    definition,
    context,
    addedAt: new Date().toISOString(),
  });

  if (data[userId].length > MAX_WORDS_PER_USER) {
    data[userId] = data[userId].slice(0, MAX_WORDS_PER_USER);
  }

  saveData(data);
  return { added: true, words: data[userId] };
}

/** ES: Elimina una palabra por ID.
    EN: Deletes a word by ID. */
export function removeVocabWord(userId, wordId) {
  const data = loadData();
  if (!data[userId]) return [];
  data[userId] = data[userId].filter((w) => w.id !== wordId);
  saveData(data);
  return data[userId];
}
