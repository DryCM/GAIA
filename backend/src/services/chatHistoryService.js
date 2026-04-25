/* ================================================================
   GaIA Chat History Service / Servicio de Historial de Chat
   ES: Persiste las conversaciones de cada usuario en archivos JSON
       dentro de data/chat-history/{userId}.json.
       Cada archivo contiene un array de conversaciones con sus
       mensajes, modo de habla y marcas de tiempo.
   EN: Persists each user's conversations in JSON files under
       data/chat-history/{userId}.json.
       Each file holds an array of conversations with their
       messages, speech mode and timestamps.
   ================================================================ */

import fs    from "node:fs";
import path  from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ES: Directorio raíz donde se almacenan los historiales
// EN: Root directory where chat histories are stored
const HISTORY_DIR = path.resolve(
  __dirname, "../../data/chat-history"
);

// ES: Límites de seguridad para evitar archivos excesivamente grandes
// EN: Safety limits to prevent excessively large files
const MAX_CONVERSATIONS_PER_USER = 100;   // ES: máx. conversaciones guardadas / EN: max saved conversations
const MAX_MESSAGES_PER_CONV      = 200;   // ES: máx. mensajes por conversación / EN: max messages per conversation
const MAX_TEXT_STORED            = 2500;  // ES: carácteres máx por mensaje guardado / EN: max chars per stored message

// ES: Crea el directorio de historial si no existe (síncrono en arranque)
// EN: Creates the history directory if missing (sync at startup)
if (!fs.existsSync(HISTORY_DIR)) {
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
}

// ── Seguridad: sanitizar userId para nombres de archivo ──────────────────
// ES: Solo permite letras, números, guiones y guiones bajos.
//     Cualquier otro carácter se reemplaza con guión bajo.
// EN: Only allows letters, numbers, hyphens and underscores.
//     Any other character is replaced with an underscore.
function safeFileName(userId) {
  return String(userId || "anon")
    .trim()
    .slice(0, 64)
    .replace(/[^a-zA-Z0-9_-]/g, "_");
}

function historyFilePath(userId) {
  return path.join(HISTORY_DIR, `${safeFileName(userId)}.json`);
}

// ── Lectura / Read ────────────────────────────────────────────────────────
// ES: Carga el historial completo de un usuario.
//     Devuelve un array vacío si no existe o el archivo está corrupto.
// EN: Loads the full history for a user.
//     Returns an empty array if missing or the file is corrupt.
function loadHistory(userId) {
  const filePath = historyFilePath(userId);
  if (!fs.existsSync(filePath)) return [];

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ── Escritura / Write ─────────────────────────────────────────────────────
// ES: Guarda el historial completo de un usuario.
//     Escribe de forma atómica (tmp → rename) para evitar corrupción.
// EN: Saves the full history for a user.
//     Writes atomically (tmp → rename) to avoid corruption.
function saveHistory(userId, conversations) {
  const filePath = historyFilePath(userId);
  const tmpPath  = `${filePath}.tmp`;

  // ES: Recortar al límite máximo (las más antiguas primero en caso de overflow)
  // EN: Trim to max limit (oldest first in case of overflow)
  const trimmed = conversations.slice(-MAX_CONVERSATIONS_PER_USER);

  fs.writeFileSync(tmpPath, JSON.stringify(trimmed, null, 2), "utf8");
  fs.renameSync(tmpPath, filePath);
}

// ── API Pública / Public API ──────────────────────────────────────────────

// ES: Crea una nueva conversación y devuelve su ID único.
// EN: Creates a new conversation and returns its unique ID.
function startConversation(userId, mode) {
  const history = loadHistory(userId);

  const conv = {
    id:        `conv_${crypto.randomUUID()}`,
    startedAt: new Date().toISOString(),
    mode:      String(mode || "teacher"),
    messages:  [],
  };

  history.push(conv);
  saveHistory(userId, history);
  return conv.id;
}

// ES: Añade un par (usuario + asistente) a una conversación existente.
//     Si convId no existe, crea una nueva conversación automáticamente.
// EN: Adds a (user + assistant) pair to an existing conversation.
//     If convId doesn't exist, creates a new conversation automatically.
function appendMessages(userId, convId, userText, assistantText, mode) {
  const history = loadHistory(userId);

  let conv = history.find((c) => c.id === convId);

  if (!conv) {
    // ES: Crear conversación si no existe (robustez ante reinicios)
    // EN: Create conversation if missing (robust against restarts)
    conv = {
      id:        convId || `conv_${crypto.randomUUID()}`,
      startedAt: new Date().toISOString(),
      mode:      String(mode || "teacher"),
      messages:  [],
    };
    history.push(conv);
  }

  const now = new Date().toISOString();

  // ES: Añadir los dos mensajes del turno
  // EN: Add both messages of the turn
  conv.messages.push(
    { role: "user",      text: String(userText      || "").slice(0, MAX_TEXT_STORED), at: now },
    { role: "assistant", text: String(assistantText || "").slice(0, MAX_TEXT_STORED), at: now },
  );

  // ES: Recortar mensajes si la conversación es muy larga
  // EN: Trim messages if the conversation is very long
  if (conv.messages.length > MAX_MESSAGES_PER_CONV) {
    conv.messages = conv.messages.slice(-MAX_MESSAGES_PER_CONV);
  }

  // ES: Actualizar la marca de tiempo del último mensaje
  // EN: Update the last-message timestamp
  conv.updatedAt = now;

  saveHistory(userId, history);
}

// ES: Devuelve todas las conversaciones de un usuario, opcionalmente
//     filtradas por modo. Más recientes primero.
// EN: Returns all conversations for a user, optionally filtered by
//     mode. Most recent first.
function getHistory(userId, { mode, limit = 50 } = {}) {
  let history = loadHistory(userId);

  if (mode) {
    history = history.filter((c) => c.mode === mode);
  }

  return history
    .slice(-limit)
    .reverse()                    // ES: más recientes primero / EN: most recent first
    .map((c) => ({
      id:         c.id,
      startedAt:  c.startedAt,
      updatedAt:  c.updatedAt || c.startedAt,
      mode:       c.mode,
      preview:    c.messages[0]?.text?.slice(0, 80) || "",   // ES: primer mensaje como vista previa / EN: first message as preview
      totalTurns: Math.floor(c.messages.length / 2),
    }));
}

// ES: Devuelve los mensajes completos de una conversación específica.
// EN: Returns the full messages of a specific conversation.
function getConversation(userId, convId) {
  const history = loadHistory(userId);
  const conv = history.find((c) => c.id === convId);
  return conv || null;
}

// ES: Elimina todo el historial de un usuario (con consentimiento explícito).
// EN: Deletes all history for a user (requires explicit consent).
function clearHistory(userId) {
  const filePath = historyFilePath(userId);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// ES: Elimina una sola conversación del historial de un usuario.
// EN: Deletes a single conversation from a user's history.
function deleteConversation(userId, convId) {
  const history = loadHistory(userId);
  const filtered = history.filter((c) => c.id !== convId);
  if (filtered.length !== history.length) {
    saveHistory(userId, filtered);
    return true;
  }
  return false;
}

export {
  startConversation,
  appendMessages,
  getHistory,
  getConversation,
  clearHistory,
  deleteConversation,
};
