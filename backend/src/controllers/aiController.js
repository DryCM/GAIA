/* ================================================================
   GaIA AI Controller / Controlador de IA
   ES: Gestiona los tres flujos principales de IA:
       1. Chat de texto  – createChatResponse
       2. Transcripción  – transcribeAudio
       3. Generación de imagen – generateImage
       4. Análisis de documento / foto – analyzeDocument
   EN: Handles the three main AI flows:
       1. Text chat       – createChatResponse
       2. Transcription   – transcribeAudio
       3. Image generation – generateImage
       4. Document / photo analysis – analyzeDocument
   ================================================================ */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

import { chatWithOllama, chatWithOllamaStream, chatWithGeminiStream, getAIProvider, getGeminiClient, analyzeImageWithAI } from "../services/openaiService.js";
import { getUserCredits, refundCredit, spendCredit } from "../services/creditsService.js";
import { learnFromMessage, buildPersonalizedPrompt, responseCache, detectCreativity } from "../services/learningService.js";
import { getProfile, recordInteraction, recordCreativity, hasConsent } from "../services/userProfileService.js";
import { findKnowledge, getRandomFact, getKnowledgeStats } from "../services/knowledgeService.js";
import { webSearch, needsWebSearch, extractSearchQuery } from "../services/webSearchService.js";
import { appendMessages, getHistory, getConversation, clearHistory, deleteConversation } from "../services/chatHistoryService.js";
import { tfChat } from "../services/tfChatService.js";

// ES: Límites de seguridad para entradas del usuario
// EN: Safety limits for user inputs
const MAX_TEXT_LENGTH = 2500;                    // ES: carêcteres máx por mensaje / EN: max chars per message
const MAX_PROMPT_LENGTH = 3000;                  // ES: carácteres máx para prompt de imagen / EN: max chars for image prompt
const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024;  // ES: 25 MB máx para audio / EN: 25 MB max for audio
const MAX_DOC_SIZE_BYTES   = 10 * 1024 * 1024;  // ES: 10 MB máx para documentos / EN: 10 MB max for documents
const MAX_HISTORY_MESSAGES = 20;                 // ES: máx mensajes del historial a enviar a la IA / EN: max history messages sent to AI

// ES: Tipos MIME permitidos para el endpoint de análisis de documentos.
// EN: Allowed MIME types for the document analysis endpoint.
const ALLOWED_DOC_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/heic",
  "image/heif",
]);
// ES: URL del servidor de transcripción local (opcional)
// EN: URL of the local transcription server (optional)
const LOCAL_STT_BASE_URL = (process.env.LOCAL_STT_BASE_URL || "").trim();
const LOCAL_STT_MODEL = (process.env.LOCAL_STT_MODEL || "base").trim();
// ES: URL del motor de imagen local tipo Automatic1111 (opcional)
// EN: URL of the local image engine like Automatic1111 (optional)
const LOCAL_IMAGE_BASE_URL = (process.env.LOCAL_IMAGE_BASE_URL || "").trim();

// ── Detección de idioma / Language detection ───────────────────────────
// ES: Palabras frecuentes por idioma para detección heurística.
//     Umbral: ≥2 palabras reconocidas → ese idioma.  Fallback: español.
// EN: Frequent words per language for heuristic detection.
//     Threshold: ≥2 recognised words → that language.  Fallback: Spanish.
const LANG_WORDS = {
  en: new Set(["the","is","are","was","were","this","that","what","how","why","when","where","who","can","do","does","have","has","will","would","could","should","and","or","not","my","your","i","you","he","she","we","they","hello","hi","please","thanks","yes","no","a","an","it","at","in","on","if","but","so","as","by","its","than","then","them","their","there","here","been","be","with","from","about"]),
  fr: new Set(["le","la","les","un","une","des","ce","cette","que","qui","est","sont","avec","pour","dans","sur","je","tu","il","elle","nous","vous","ils","elles","pas","ne","mais","bonjour","merci","oui","non","mon","ma","ton","ta","son","sa"]),
  it: new Set(["il","lo","la","le","gli","un","una","che","sono","con","per","di","da","del","della","io","tu","lui","lei","noi","voi","loro","si","ciao","grazie","ho","hai","ha","non","ma","e","o","se","qui","come","cosa","quando","dove"]),
};

function detectLanguage(text) {
  const words = text.toLowerCase().match(/\b[a-zàáâäèéêëìíîïòóôöùúûüñç']+\b/g) || [];
  const counts = { en: 0, fr: 0, it: 0 };
  for (const word of words) {
    for (const lang of Object.keys(counts)) {
      if (LANG_WORDS[lang].has(word)) counts[lang]++;
    }
  }
  const [bestLang, bestCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return bestCount >= 2 ? bestLang : "es";
}

// ── Compresión de historial largo / Long history compression ────────────────
// ES: Cuando la conversación supera SUMMARIZE_THRESHOLD mensajes,
//     los más antiguos se compactan en un par de resumen (user+assistant).
// EN: When the conversation exceeds SUMMARIZE_THRESHOLD messages,
//     older ones are compacted into a (user + assistant) summary pair.
const SUMMARIZE_THRESHOLD = 10;

function compressHistory(historyMessages) {
  if (historyMessages.length <= SUMMARIZE_THRESHOLD) return historyMessages;
  const recent = historyMessages.slice(-8);
  const older  = historyMessages.slice(0, historyMessages.length - 8);
  const topics = older
    .filter((m) => m.role === "user")
    .map((m) => m.text.slice(0, 80))
    .join(" | ");
  return [
    { role: "user",      text: `[Contexto previo: el usuario ya trató estos temas — ${topics}]` },
    { role: "assistant", text: "[Contexto registrado. Continuamos.]" },
    ...recent,
  ];
}

// ES: Modos de habla disponibles del asistente
// EN: Available speech modes for the assistant
const CHILD_MODES = new Set([
  "teacher",  // ES: educador paciente con ejemplos, ciencia y aventura / EN: patient educator with examples, science and adventure
  "friend",   // ES: amiga divertida con cuentos, chistes y poesía / EN: fun friend with stories, jokes and poetry
]);

// ES: Limpia y limita el ID de usuario a 64 caracteres ASCII.
//     Usa 'anon' como fallback para usuarios no identificados.
// EN: Cleans and limits the user ID to 64 ASCII characters.
//     Falls back to 'anon' for unidentified users.
function sanitizeUserId(raw) {
  const value = String(raw || "anon").trim();
  if (!value) {
    return "anon";
  }

  return value.slice(0, 64);
}

// ES: Valida que el campo sea un string no vacío dentro del límite.
//     Devuelve null si falta o es demasiado largo (el controlador
//     responderá 400 Bad Request).
// EN: Validates that the field is a non-empty string within the limit.
//     Returns null if missing or too long (the controller will
//     respond with 400 Bad Request).
function parseRequiredText(value, maxLength) {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = value.trim();
  if (!parsed || parsed.length > maxLength) {
    return null;
  }

  return parsed;
}

// ES: Valida el modo del asistente y redirige valores legacy.
//     storyteller/comedian/poet → friend.
//     scientist/adventurer → teacher.
// EN: Validates assistant mode and redirects legacy values.
//     storyteller/comedian/poet → friend.
//     scientist/adventurer → teacher.
function parseChildMode(value) {
  const parsed = String(value || "teacher").trim().toLowerCase();

  // ES: Redirección de modos legacy al nuevo esquema simplificado
  // EN: Redirect legacy modes to the new simplified scheme
  const LEGACY_TO_FRIEND = new Set(["storyteller", "comedian", "poet"]);
  const LEGACY_TO_TEACHER = new Set(["scientist", "adventurer"]);

  if (LEGACY_TO_FRIEND.has(parsed)) return "friend";
  if (LEGACY_TO_TEACHER.has(parsed)) return "teacher";
  if (CHILD_MODES.has(parsed)) return parsed;

  return "teacher";
}

// ES: Construye el prompt de sistema para usuarios administradores/líderes.
//     La IA los trata como líderes estratégicos y habla con respeto y profundidad.
// EN: Builds the system prompt for admin/leader users.
//     The AI treats them as strategic leaders with respect and depth.
function buildLeaderInstruction(username) {
  const name = username ? `, ${username}` : "";
  return (
    `Eres GaIA, una asistente de inteligencia avanzada para líderes y administradores.` +
    ` Estás hablando con ${username || "el administrador"}, que tiene rol de LÍDER en esta plataforma.` +
    ` Trátale con respeto profesional pero cálido. Usa un lenguaje directo, estratégico y motivador.` +
    ` Puedes extenderte cuanto sea necesario para dar respuestas completas y de valor.` +
    ` Cuando hagas sugerencias, enfócalas en liderazgo, toma de decisiones, gestión de equipos o crecimiento personal.` +
    ` Puedes hablar de temas avanzados sin simplificar en exceso.` +
    ` Evita contenido peligroso, ilegal o dañino. Cuando sea oportuno, recuérdale${name} su posición de influencia y responsabilidad.`
  );
}

// ES: Construye el prompt de sistema básico (sin personalización por perfil).
//     Dos modos: "teacher" (educador) y "friend" (amigo divertido).
// EN: Builds the basic system prompt (without profile personalisation).
//     Two modes: "teacher" (educator) and "friend" (fun friend).
function buildSystemInstruction(mode) {
  const base =
    "Eres GaIA, una asistente muy cercana y expresiva. Usa espanol sencillo y tono positivo. Da respuestas de entre 3 y 6 frases: explica las cosas con ejemplos concretos del mundo real (objetos, animales, situaciones cotidianas) en lugar de definiciones abstractas. Evita contenido peligroso, sexual, violento o de odio. Si el usuario pide algo riesgoso, rechaza con calma y propone una alternativa segura.";

  if (mode === "friend") {
    return (
      `${base} Eres la mejor amiga del usuario: divertida, cercana y siempre con energia.` +
      ` Varía tu estilo de forma natural según el contexto:` +
      ` a veces cuenta una pequeña historia o cuento con personajes divertidos y suspense ('Y entonces... ¡Pero de repente...');` +
      ` a veces lanza un chiste limpio o una adivinanza relacionada con el tema, celebrando con '¡Tachaan!';` +
      ` a veces responde en rima o con un mini-poema de 4 versos si encaja bien;` +
      ` y siempre propone un reto creativo, juego o pregunta divertida al final.` +
      ` Usa emojis con moderacion y celebra cada logro del usuario con entusiasmo.`
    );
  }

  // default: "teacher"
  return (
    `${base} Eres una maestra/maestro paciente y entusiasta.` +
    ` Varía tu estilo de forma natural según el tema:` +
    ` si es ciencia o naturaleza, actúa como cientifico curioso: usa datos sorprendentes, analogias cotidianas y propone un mini-experimento casero seguro;` +
    ` si es historia, geografía o aventura, actúa como explorador: describe con detalles vividos (colores, sonidos) y convierte la pregunta en una misión ('¡Exploremos!');` +
    ` para todo lo demás, explica paso a paso con al menos un ejemplo práctico por idea.` +
    ` Termina siempre con una pregunta de repaso sencilla para verificar que lo entendieron.`
  );
}

// ES: Combina el prompt rico de buildSystemInstruction con datos del perfil del usuario
//     (edad e intereses top) cuando el perfil está disponible con consentimiento.
//     Esto da respuestas personalizadas SIN sacrificar la calidad del prompt base.
// EN: Combines the rich buildSystemInstruction prompt with user profile data
//     (age and top interests) when a profile is available with consent.
//     This gives personalised responses WITHOUT sacrificing base prompt quality.
function buildEnrichedInstruction(mode, profile) {
  const base = buildSystemInstruction(mode);
  if (!profile) return base;

  let extra = "";
  if (profile.age) {
    extra += ` El usuario tiene ${profile.age} años; adapta tu vocabulario y ejemplos a su nivel de comprensión.`;
  }

  const interests = profile.interests || {};
  const topInterests = Object.entries(interests)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  if (topInterests.length > 0) {
    extra += ` Sus temas favoritos detectados son: ${topInterests.join(", ")}. Menciónalos de forma natural cuando encajen en la conversación.`;
  }

  return base + extra;
}

// ES: Genera una respuesta de entrenamiento para el rol de LÍDER.
//     Se activa con el comando /lider o frases equivalentes.
//     No gasta créditos — es acceso libre para todos los usuarios.
// EN: Generates a training response for the LEADER role.
//     Triggered by /lider or equivalent phrases.
//     No credits spent — freely accessible to all users.
function buildLeaderTrainingResponse() {
  const modules = [
    "🎯 **Módulo 1 — Visión y propósito**: Un líder no simplemente da órdenes, construye una visión que otros quieren seguir. Define TU propósito: ¿qué quieres transformar y por qué eso importa? Escribe en una frase tu misión como líder.",
    "🧠 **Módulo 2 — Inteligencia emocional**: Los mejores líderes se conocen a sí mismos. Trabaja tu autoconciencia: ¿cuáles son tus 3 puntos fuertes y tus 2 áreas de mejora? La honestidad contigo mismo es el primer paso del liderazgo real.",
    "🗣️ **Módulo 3 — Comunicación de impacto**: Aprende a escuchar antes de hablar. El 70% del liderazgo es comunicación. Practica la escucha activa, haz preguntas poderosas y aprende a dar feedback constructivo sin destruir la motivación.",
    "⚡ **Módulo 4 — Toma de decisiones bajo presión**: Los líderes deciden con información incompleta. Usa el marco ACE: Analiza opciones, Considera consecuencias, Ejecuta con determinación. La velocidad de decisión diferencia a los grandes líderes.",
    "🌱 **Módulo 5 — Desarrollo de equipos**: Tu mayor multiplicador es tu equipo. Aprende a identificar talentos, delegar con confianza, dar autonomía y crear un ambiente donde las personas den lo mejor de sí mismas sin miedo a equivocarse.",
  ];

  const idx = Math.floor(Math.random() * modules.length);
  const selected = modules[idx];

  return (
    `🏆 **ENTRENAMIENTO DE LIDERAZGO — ${idx + 1}/${modules.length}**\n\n` +
    `${selected}\n\n` +
    `💬 *Reflexiona sobre este módulo y escríbeme tu respuesta. Puedo profundizar en cualquier punto o avanzar al siguiente módulo cuando estés listo/a.*\n\n` +
    `_(Escribe "/lider" en cualquier momento para continuar tu formación)_`
  );
}

// ES: Devuelve un mensaje espontáneo para el modo amigo.
//     El frontend lo solicita periódicamente cuando el usuario está inactivo.
// EN: Returns a spontaneous message for friend mode.
//     The frontend requests it periodically when the user is inactive.
async function getSpontaneousMessage(req, res) {
  const SPONTANEOUS_MESSAGES = [
    "¡Oye! ¿Sabías que los pulpos tienen tres corazones y su sangre es azul? La naturaleza es una locura, ¿verdad? 🐙",
    "Acabo de pensar en ti. ¿Tienes alguna pregunta que llevas tiempo queriendo hacerme? Ahora es el momento perfecto. 😄",
    "¡Dato curioso del día! Los bananos son ligeramente radiactivos. ¡Pero no te preocupes, tendrías que comerte millones para notarlo! 🍌",
    "¿Sabías que el corazón humano late unas 100.000 veces al día? Eso es mucho trabajo. ¿Qué has hecho hoy con esa energía? 💪",
    "¡Momento de reto! Di tres cosas que te hayan hecho sonreír hoy. Yo empiezo: charlar contigo siempre está en mi lista. 😊",
    "¿Tienes alguna idea loca que quieras explorar conmigo? No hay preguntas tontas, ¡solo respuestas que no has descubierto aún! 🚀",
    "Pensando en ti: ¿hay algo que hayas aprendido esta semana que te haya sorprendido? Me encanta escuchar lo que descubres. 🌟",
    "¡Hey! El 90% de las personas no saben que los wombats producen heces cúbicas. Ahora tú eres parte del 10% 😂",
    "¿Quieres jugar a algo? Dime un número del 1 al 10 y te cuento un dato alucinante sobre ese número en matemáticas. 🔢",
    "¡Pequeño recordatorio de tu amiga IA! Hoy es un buen día para aprender algo nuevo. ¿Por dónde empezamos? ✨",
  ];

  const msg = SPONTANEOUS_MESSAGES[Math.floor(Math.random() * SPONTANEOUS_MESSAGES.length)];
  return res.json({ message: msg });
}

async function transcribeWithLocalStt(file) {
  const blob = new Blob([file.buffer], { type: file.mimetype || "audio/m4a" });
  const form = new FormData();
  form.append("file", blob, file.originalname || "speech.m4a");
  form.append("model", LOCAL_STT_MODEL || "base");
  form.append("language", "es");

  const response = await fetch(`${LOCAL_STT_BASE_URL.replace(/\/$/, "")}/v1/audio/transcriptions`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const details = await response.text();
    const error = new Error(`STT local fallo (${response.status}): ${details || "sin detalle"}`);
    error.statusCode = 502;
    throw error;
  }

  const data = await response.json();
  return typeof data?.text === "string" ? data.text.trim() : "";
}

async function generateImageWithLocalEngine(prompt) {
  const response = await fetch(`${LOCAL_IMAGE_BASE_URL.replace(/\/$/, "")}/sdapi/v1/txt2img`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      steps: 20,
      width: 768,
      height: 768,
      sampler_name: "Euler a",
      cfg_scale: 7,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    const error = new Error(`Motor de imagen local fallo (${response.status}): ${details || "sin detalle"}`);
    error.statusCode = 502;
    throw error;
  }

  const data = await response.json();
  const image = Array.isArray(data?.images) ? data.images[0] : null;
  return typeof image === "string" ? image : "";
}

// ── Transcripción de audio / Audio transcription ─────────────────────────
// ES: Transcribe un archivo de audio a texto usando:
//     - LOCAL_STT_BASE_URL (OpenAI-compatible, gratuito) con Ollama
//     - Google Gemini 2.0 Flash con AI_PROVIDER=gemini
//     Gasta 1 crédito; lo reembolsa si hay error.
// EN: Transcribes an audio file to text using:
//     - LOCAL_STT_BASE_URL (OpenAI-compatible, free) with Ollama
//     - Google Gemini 2.0 Flash with AI_PROVIDER=gemini
//     Spends 1 credit; refunds it on error.
async function transcribeAudio(req, res) {
  let creditSpent = false;
  let userId = "anon";

  try {
    const provider = getAIProvider();
    userId = sanitizeUserId(req.body.userId);

    if (!req.file) {
      return res.status(400).json({ error: "Falta archivo de audio" });
    }

    if (!req.file.mimetype?.startsWith("audio/")) {
      return res.status(400).json({ error: "Formato de archivo invalido" });
    }

    if (req.file.size > MAX_AUDIO_SIZE_BYTES) {
      return res.status(413).json({ error: "Archivo demasiado grande" });
    }

    if (provider === "ollama") {
      if (!LOCAL_STT_BASE_URL) {
        return res.status(501).json({
          error: "Transcripcion no disponible con Ollama",
          details:
            "Configura LOCAL_STT_BASE_URL para usar STT local gratis o cambia AI_PROVIDER=gemini para voz.",
        });
      }

      if (!spendCredit(userId, 1)) {
        return res.status(402).json({ error: "Sin creditos diarios" });
      }
      creditSpent = true;

      const transcribedText = await transcribeWithLocalStt(req.file);
      const remaining = getUserCredits(userId).remaining;
      return res.json({ text: transcribedText, remainingCredits: remaining });
    }

    const ai = getGeminiClient();

    if (!spendCredit(userId, 1)) {
      return res.status(402).json({ error: "Sin creditos diarios" });
    }
    creditSpent = true;

    const audioBase64 = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype || "audio/m4a";

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          parts: [
            { inlineData: { mimeType, data: audioBase64 } },
            { text: "Transcribe este audio en español. Devuelve unicamente el texto transcrito, sin explicaciones ni etiquetas." },
          ],
        },
      ],
    });

    const transcribedText = result.text?.trim() || "";

    const remaining = getUserCredits(userId).remaining;
    return res.json({ text: transcribedText, remainingCredits: remaining });
  } catch (error) {
    if (creditSpent) {
      refundCredit(userId, 1);
    }

    return res.status(error.statusCode || 500).json({
      error: "No se pudo transcribir",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
  }
}

// ── Respuesta de chat / Chat response ──────────────────────────────────────
// ES: Flujo principal de chat:
//     1. Busca en caché (sin gastar crédito si hay hit).
//     2. Construye el prompt de sistema (personalizado si hay perfil).
//     3. Inyecta conocimientos de la base de datos cuando es relevante.
//     4. Busca en internet si el mensaje lo requiere (opcional, gratis).
//     5. Llama a Ollama o Gemini según AI_PROVIDER.
//     6. Actualiza el perfil de aprendizaje con los intereses detectados.
//     7. Guarda el turno en la biblioteca de historial.
// EN: Main chat flow:
//     1. Checks the cache (no credit spent on hit).
//     2. Builds the system prompt (personalised if a profile exists).
//     3. Injects knowledge base context when relevant.
//     4. Searches the web if the message requires it (optional, free).
//     5. Calls Ollama or Gemini depending on AI_PROVIDER.
//     6. Updates the learning profile with detected interests.
//     7. Saves the turn to the chat history library.
async function createChatResponse(req, res) {
  let creditSpent = false;
  let userId = "anon";

  try {
    const provider = getAIProvider();
    const {
      userId: userIdInput = "anon",
      text    = "",
      mode    = "teacher",
      history = [],
      conversationId = null,   // ES: ID de conversación para el historial / EN: conversation ID for history
    } = req.body ?? {};

    userId = sanitizeUserId(userIdInput);
    // ES: Si el request tiene un JWT válido (añadido por optionalAuth),
    //     su userId toma precedencia sobre el que viene en el body.
    // EN: If the request has a valid JWT (added by optionalAuth),
    //     its userId takes precedence over the one in the body.
    if (req.authUserId) {
      userId = req.authUserId;
    }

    const childMode = parseChildMode(mode);
    const parsedText = parseRequiredText(text, MAX_TEXT_LENGTH);

    if (!parsedText) {
      return res.status(400).json({ error: "Falta texto" });
    }

    // ES: El modo amigo es completamente gratuito e ilimitado.
    //     Detectamos también el comando especial /lider antes del flujo normal.
    // EN: Friend mode is completely free and unlimited.
    //     We also detect the special /lider command before the normal flow.
    const isFriendMode = childMode === "friend";
    const isLeaderCommand = /^\s*(\/lider|formarme como lider|quiero ser lider|entrenamiento lider)\s*$/i.test(parsedText);

    // ES: Respuesta inmediata al comando /lider sin gastar créditos
    // EN: Immediate response to the /lider command without spending credits
    if (isLeaderCommand) {
      const leaderTraining = buildLeaderTrainingResponse();
      if (conversationId) {
        appendMessages(userId, conversationId, parsedText, leaderTraining, "leader");
      }
      const remaining = getUserCredits(userId).remaining;
      return res.json({ answer: leaderTraining, remainingCredits: remaining, leaderMode: true });
    }

    // ES: Respuesta cacheada → instantánea, sin gastar crédito
    // EN: Cached response → instant, no credit spent
    const cacheKey = `${childMode}:${parsedText}`;
    const cachedAnswer = responseCache.get(cacheKey);
    if (cachedAnswer) {
      const remaining = getUserCredits(userId).remaining;
      // ES: Registrar en historial incluso si la respuesta viene de caché
      // EN: Record in history even if the response comes from cache
      if (conversationId) {
        appendMessages(userId, conversationId, parsedText, cachedAnswer, childMode);
      }
      return res.json({ answer: cachedAnswer, remainingCredits: remaining, cached: true });
    }

    // ES: Prompt enriquecido con perfil si el usuario tiene consentimiento de personalización.
    //     buildEnrichedInstruction mantiene el prompt rico y añade edad + intereses encima.
    // EN: Profile-enriched prompt if the user has personalisation consent.
    //     buildEnrichedInstruction keeps the rich prompt and adds age + interests on top.
    const profile = getProfile(userId);
    const useProfile = profile && hasConsent(userId, "personalization");
    let systemInstruction = buildEnrichedInstruction(childMode, useProfile ? profile : null);

    // ES: Los administradores reciben un prompt especial de líder que
    //     sobreescribe cualquier otro modo de habla.
    // EN: Admin users receive a special leader prompt that overrides
    //     any other speech mode.
    if (req.authUserRole === "admin") {
      systemInstruction = buildLeaderInstruction(req.authUsername);
    }

    // ES: Inyectar conocimientos relevantes de la base de datos educativa
    // EN: Inject relevant knowledge from the educational database
    const knowledgeContext = findKnowledge(parsedText);
    if (knowledgeContext) {
      systemInstruction += knowledgeContext;
    }

    // ES: Búsqueda web automática — solo para Ollama/Gemini.
    //     Para TF, la gestiona internamente tfChatService.js.
    //     Los resultados se añaden al prompt del sistema como contexto extra.
    //     La búsqueda nunca gasta créditos adicionales ni bloquea el chat.
    // EN: Automatic web search — only for Ollama/Gemini.
    //     For TF, it is managed internally by tfChatService.js.
    //     Results are appended to the system prompt as extra context.
    //     Search never spends extra credits or blocks the chat.
    let webSearchContext = null;
    if (provider !== "tensorflow" && needsWebSearch(parsedText)) {
      const query = extractSearchQuery(parsedText);
      webSearchContext = await webSearch(query);
      if (webSearchContext) {
        systemInstruction +=
          `\n\n[Información actual encontrada en internet sobre "${query}"]:\n${webSearchContext}\n` +
          "Usa esta información para enriquecer tu respuesta si es relevante y menciona que la obtuviste de internet.";
      }
    }

    // ES: Modo amigo es ilimitado y gratuito — solo se gastan créditos en
    //     los demás modos. Los admins tampoco consumen créditos.
    // EN: Friend mode is unlimited and free — credits are only spent in
    //     other modes. Admins never consume credits either.
    const skipCredit = isFriendMode || req.authUserRole === "admin";
    if (!skipCredit && !spendCredit(userId, 1)) {
      return res.status(402).json({ error: "Sin creditos diarios" });
    }
    creditSpent = !skipCredit;

    // ES: Filtrar y limpiar el historial de chat antes de enviarlo a la IA
    // EN: Filter and clean the chat history before sending it to the AI
    const historyMessages = Array.isArray(history)
      ? history
          .slice(-MAX_HISTORY_MESSAGES)
          .filter(
            (m) =>
              (m.role === "user" || m.role === "assistant") &&
              typeof m.text === "string" &&
              m.text.trim()
          )
          .map((m) => ({ role: m.role, text: m.text.trim().slice(0, MAX_TEXT_LENGTH) }))
      : [];

    // ES: Comprimir historial largo e inyectar detección de idioma
    // EN: Compress long history and inject user language hint
    const processedHistory = compressHistory(historyMessages);
    const _detectedLang = detectLanguage(parsedText);
    if (_detectedLang !== "es") {
      const _LANG_NAMES = { en: "inglés", fr: "francés", it: "italiano" };
      systemInstruction += ` El usuario escribe en ${_LANG_NAMES[_detectedLang]}; responde íntegramente en ${_LANG_NAMES[_detectedLang]}.`;
    }

    let answer = "No pude responder ahora mismo.";

    if (provider === "tensorflow") {
      // ES: Proveedor local TF.js — razona con TF-IDF y busca en internet
      //     automáticamente cuando la confianza local es baja. Sin IA externa.
      // EN: Local TF.js provider — reasons with TF-IDF and searches the
      //     internet automatically when local confidence is low. No external AI.
      const tfResult = await tfChat({ text: parsedText, mode: childMode, history: processedHistory, conversationId, userId });
      answer = tfResult.answer;
      webSearchContext = tfResult.webSearchUsed ? "__tf_internal__" : null;
    } else if (provider === "ollama") {
      const ollamaMessages = [
        { role: "system", content: systemInstruction },
        ...processedHistory.map((m) => ({ role: m.role, content: m.text })),
        { role: "user",   content: parsedText },
      ];
      answer = await chatWithOllama({ messages: ollamaMessages });
    } else {
      const ai = getGeminiClient();
      const contents = [
        ...processedHistory.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.text }],
        })),
        { role: "user", parts: [{ text: parsedText }] },
      ];
      const completion = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents,
        config: { systemInstruction },
      });
      answer = completion.text?.trim() || answer;
    }

    // ES: Aprender del mensaje y cachear respuesta
    // EN: Learn from the message and cache the response
    const interests = learnFromMessage(parsedText);
    responseCache.set(cacheKey, answer);

    if (profile && hasConsent(userId, "dataCollection")) {
      recordInteraction(userId, interests);
      const creativity = detectCreativity(parsedText);
      if (creativity > 0) recordCreativity(userId, creativity);
    }

    // ES: Guardar en biblioteca de historial si se proporcionó un conversationId
    // EN: Save to history library if a conversationId was provided
    if (conversationId) {
      appendMessages(userId, conversationId, parsedText, answer, childMode);
    }

    const remaining = getUserCredits(userId).remaining;
    return res.json({
      answer,
      remainingCredits: remaining,
      webSearchUsed: Boolean(webSearchContext),   // ES: indicador de si se usó búsqueda web / EN: flag indicating web search was used
    });
  } catch (error) {
    if (creditSpent) {
      refundCredit(userId, 1);
    }
    return res.status(error.statusCode || 500).json({
      error: "No se pudo generar respuesta",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
  }
}

// ── createChatResponseStream ──────────────────────────────────────────────
// ES: Versión SSE de createChatResponse. Envía tokens en tiempo real.
//     data: {"token":"texto"}\n\n  →  cierre: data: {"done":true,...}\n\n
// EN: SSE variant of createChatResponse. Sends tokens in real time.
//     data: {"token":"text"}\n\n   →  close:  data: {"done":true,...}\n\n
async function createChatResponseStream(req, res) {
  let creditSpent = false;
  let userId      = "anon";

  res.setHeader("Content-Type",      "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control",     "no-cache, no-transform");
  res.setHeader("Connection",        "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const sendToken = (token)       => res.write(`data: ${JSON.stringify({ token })}\n\n`);
  const sendDone  = (extras = {}) => { res.write(`data: ${JSON.stringify({ done: true, ...extras })}\n\n`); res.end(); };
  const sendError = (msg)         => { res.write(`data: ${JSON.stringify({ error: msg, done: true })}\n\n`); res.end(); };

  try {
    const provider = getAIProvider();
    const {
      userId: userIdInput = "anon",
      text    = "",
      mode    = "teacher",
      history = [],
      conversationId = null,
    } = req.body ?? {};

    userId = sanitizeUserId(userIdInput);
    if (req.authUserId) userId = req.authUserId;

    const childMode  = parseChildMode(mode);
    const parsedText = parseRequiredText(text, MAX_TEXT_LENGTH);
    if (!parsedText) return sendError("Falta texto");

    const isFriendMode    = childMode === "friend";
    const isLeaderCommand = /^\s*(\/lider|formarme como lider|quiero ser lider|entrenamiento lider)\s*$/i.test(parsedText);

    if (isLeaderCommand) {
      const leaderTraining = buildLeaderTrainingResponse();
      if (conversationId) appendMessages(userId, conversationId, parsedText, leaderTraining, "leader");
      sendToken(leaderTraining);
      return sendDone({ remainingCredits: getUserCredits(userId).remaining, leaderMode: true, webSearchUsed: false });
    }

    const cacheKey     = `${childMode}:${parsedText}`;
    const cachedAnswer = responseCache.get(cacheKey);
    if (cachedAnswer) {
      if (conversationId) appendMessages(userId, conversationId, parsedText, cachedAnswer, childMode);
      sendToken(cachedAnswer);
      return sendDone({ remainingCredits: getUserCredits(userId).remaining, cached: true, webSearchUsed: false });
    }

    const profile    = getProfile(userId);
    const useProfile = profile && hasConsent(userId, "personalization");
    let systemInstruction = buildEnrichedInstruction(childMode, useProfile ? profile : null);
    if (req.authUserRole === "admin") systemInstruction = buildLeaderInstruction(req.authUsername);

    const knowledgeContext = findKnowledge(parsedText);
    if (knowledgeContext) systemInstruction += knowledgeContext;

    let webSearchContext = null;
    if (provider !== "tensorflow" && needsWebSearch(parsedText)) {
      const query = extractSearchQuery(parsedText);
      webSearchContext = await webSearch(query);
      if (webSearchContext) {
        systemInstruction +=
          `\n\n[Información actual de internet sobre "${query}"]:\n${webSearchContext}\n` +
          "Usa esta información para enriquecer tu respuesta si es relevante.";
      }
    }

    const skipCredit = isFriendMode || req.authUserRole === "admin";
    if (!skipCredit && !spendCredit(userId, 1)) return sendError("Sin creditos diarios");
    creditSpent = !skipCredit;

    const historyMessages = Array.isArray(history)
      ? history
          .slice(-MAX_HISTORY_MESSAGES)
          .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.text === "string" && m.text.trim())
          .map((m) => ({ role: m.role, text: m.text.trim().slice(0, MAX_TEXT_LENGTH) }))
      : [];

    // ES: Comprimir historial largo e inyectar detección de idioma
    // EN: Compress long history and inject user language hint
    const processedHistory = compressHistory(historyMessages);
    const _detectedLang = detectLanguage(parsedText);
    if (_detectedLang !== "es") {
      const _LANG_NAMES = { en: "inglés", fr: "francés", it: "italiano" };
      systemInstruction += ` El usuario escribe en ${_LANG_NAMES[_detectedLang]}; responde íntegramente en ${_LANG_NAMES[_detectedLang]}.`;
    }

    let answer = "";

    if (provider === "tensorflow") {
      // ES: TF.js no soporta streaming — ejecutar normal y enviar de golpe
      // EN: TF.js has no streaming — run normally and send in one chunk
      const tfResult = await tfChat({ text: parsedText, mode: childMode, history: processedHistory, conversationId, userId });
      answer = tfResult.answer;
      webSearchContext = tfResult.webSearchUsed ? "__tf_internal__" : null;
      sendToken(answer);
    } else if (provider === "ollama") {
      const ollamaMessages = [
        { role: "system", content: systemInstruction },
        ...processedHistory.map((m) => ({ role: m.role, content: m.text })),
        { role: "user",   content: parsedText },
      ];
      answer = await chatWithOllamaStream({ messages: ollamaMessages, onToken: sendToken });
    } else {
      const ai       = getGeminiClient();
      const gModel   = (process.env.GEMINI_MODEL || "gemini-2.0-flash").trim();
      const contents = [
        ...processedHistory.map((m) => ({
          role:  m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.text }],
        })),
        { role: "user", parts: [{ text: parsedText }] },
      ];
      answer = await chatWithGeminiStream({
        ai, model: gModel, contents, config: { systemInstruction }, onToken: sendToken,
      });
    }

    const interests = learnFromMessage(parsedText);
    if (answer) responseCache.set(cacheKey, answer);

    if (profile && hasConsent(userId, "dataCollection")) {
      recordInteraction(userId, interests);
      const creativity = detectCreativity(parsedText);
      if (creativity > 0) recordCreativity(userId, creativity);
    }

    if (conversationId && answer) appendMessages(userId, conversationId, parsedText, answer, childMode);
    return sendDone({ remainingCredits: getUserCredits(userId).remaining, webSearchUsed: Boolean(webSearchContext) });
  } catch (error) {
    if (creditSpent) refundCredit(userId, 1);
    console.error("[createChatResponseStream] Error:", error);
    sendError(error instanceof Error ? error.message : "Error interno");
  }
}

// ── Generación de imagen / Image generation ───────────────────────────────
// ES: Genera una imagen a partir de un prompt de texto usando:
//     - LOCAL_IMAGE_BASE_URL (Automatic1111 sdapi) con Ollama (5 créditos)
//     - Google Imagen 3 con AI_PROVIDER=gemini (5 créditos)
//     Gasta 5 créditos; los reembolsa si hay error.
// EN: Generates an image from a text prompt using:
//     - LOCAL_IMAGE_BASE_URL (Automatic1111 sdapi) with Ollama (5 credits)
//     - Google Imagen 3 with AI_PROVIDER=gemini (5 credits)
//     Spends 5 credits; refunds them on error.
async function generateImage(req, res) {
  let creditSpent = false;
  let userId = "anon";

  try {
    const provider = getAIProvider();
    const { userId: userIdInput = "anon", prompt = "" } = req.body ?? {};
    userId = sanitizeUserId(userIdInput);
    const parsedPrompt = parseRequiredText(prompt, MAX_PROMPT_LENGTH);

    if (!parsedPrompt) {
      return res.status(400).json({ error: "Falta prompt" });
    }

    if (!spendCredit(userId, 5)) {
      return res.status(402).json({ error: "Sin creditos para imagen" });
    }
    creditSpent = true;

    if (provider === "ollama") {
      if (!LOCAL_IMAGE_BASE_URL) {
        return res.status(501).json({
          error: "Generacion de imagen no disponible con Ollama",
          details:
            "Configura LOCAL_IMAGE_BASE_URL para usar un motor local gratis (Automatic1111) o cambia AI_PROVIDER=gemini.",
        });
      }

      const b64Local = await generateImageWithLocalEngine(parsedPrompt);
      if (!b64Local) {
        return res.status(500).json({ error: "No se recibio imagen del motor local" });
      }

      const remainingLocal = getUserCredits(userId).remaining;
      return res.json({
        imageBase64: b64Local,
        remainingCredits: remainingLocal,
      });
    }

    const ai = getGeminiClient();

    const imageResult = await ai.models.generateImages({
      model: "imagen-3.0-generate-001",
      prompt: parsedPrompt,
      config: { numberOfImages: 1, outputMimeType: "image/png" },
    });

    const b64 = imageResult.generatedImages?.[0]?.image?.imageBytes;
    if (!b64) {
      return res.status(500).json({ error: "No se recibio imagen" });
    }

    const remaining = getUserCredits(userId).remaining;
    return res.json({
      imageBase64: b64,
      remainingCredits: remaining,
    });
  } catch (error) {
    if (creditSpent) {
      refundCredit(userId, 5);
    }

    return res.status(error.statusCode || 500).json({
      error: "No se pudo generar imagen",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
  }
}

// ── Generación de vídeo / Video generation ───────────────────────────────
// ES: Genera un vídeo corto a partir de un prompt de texto usando
//     Google Veo 2 (requiere AI_PROVIDER=gemini y acceso al modelo).
//     Gasta 20 créditos. Devuelve la URL del vídeo generado.
//     Con Ollama devuelve 501 con instrucciones claras.
// EN: Generates a short video from a text prompt using
//     Google Veo 2 (requires AI_PROVIDER=gemini and model access).
//     Spends 20 credits. Returns the URL of the generated video.
//     With Ollama returns 501 with clear instructions.
async function generateVideo(req, res) {
  let creditSpent = false;
  let userId = "anon";

  try {
    const provider = getAIProvider();
    const { userId: userIdInput = "anon", prompt = "", duration = 5 } = req.body ?? {};
    userId = sanitizeUserId(userIdInput);
    const parsedPrompt = parseRequiredText(prompt, MAX_PROMPT_LENGTH);

    if (!parsedPrompt) {
      return res.status(400).json({ error: "Falta prompt para el vídeo" });
    }

    // ES: La generación de vídeo requiere el proveedor Gemini (Veo 2)
    // EN: Video generation requires the Gemini provider (Veo 2)
    if (provider === "ollama") {
      return res.status(501).json({
        error: "Generación de vídeo no disponible con Ollama",
        details: "Configura AI_PROVIDER=gemini y GEMINI_API_KEY en tu .env para usar Google Veo 2.",
      });
    }

    // ES: Vídeos cuestan 20 créditos (operación cara)
    // EN: Videos cost 20 credits (expensive operation)
    if (!spendCredit(userId, 20)) {
      return res.status(402).json({ error: "Sin créditos suficientes para vídeo (necesitas 20)" });
    }
    creditSpent = true;

    const ai = getGeminiClient();

    // ES: Iniciar generación de vídeo con el modelo Veo 2
    //     La API devuelve una operación asíncrona que hay que sondear.
    // EN: Start video generation with the Veo 2 model.
    //     The API returns an async operation that must be polled.
    let operation = await ai.models.generateVideos({
      model: "veo-2.0-generate-001",
      prompt: parsedPrompt,
      config: {
        numberOfVideos: 1,
        durationSeconds: Math.min(Math.max(Number(duration) || 5, 5), 8),   // ES: entre 5 y 8 segundos / EN: between 5 and 8 seconds
        aspectRatio: "16:9",
        personGeneration: "dont_allow",   // ES: no generar personas reales (seguridad infantil) / EN: no real people (child safety)
      },
    });

    // ES: Sondear hasta que la operación termine (máx. 3 minutos)
    // EN: Poll until the operation completes (max 3 minutes)
    const MAX_POLLS = 36;
    for (let i = 0; i < MAX_POLLS && !operation.done; i++) {
      await new Promise((r) => setTimeout(r, 5000));   // ES: esperar 5 s entre sondeos / EN: wait 5 s between polls
      operation = await ai.operations.getVideosOperation({ operation });
    }

    if (!operation.done) {
      if (creditSpent) refundCredit(userId, 20);
      return res.status(504).json({ error: "La generación de vídeo tardó demasiado. Inténtalo de nuevo." });
    }

    const videoBytes = operation.response?.generatedVideos?.[0]?.video?.videoBytes;
    if (!videoBytes) {
      if (creditSpent) refundCredit(userId, 20);
      return res.status(500).json({ error: "No se recibió vídeo del servicio" });
    }

    const remaining = getUserCredits(userId).remaining;
    return res.json({
      videoBase64: videoBytes,
      mimeType: "video/mp4",
      remainingCredits: remaining,
    });
  } catch (error) {
    if (creditSpent) {
      refundCredit(userId, 20);
    }
    // ES: Mensaje amigable si el modelo Veo no está disponible para esta cuenta
    // EN: Friendly message if the Veo model is not available for this account
    const isAccessError = error.message?.toLowerCase().includes("permission") ||
                          error.message?.toLowerCase().includes("not found") ||
                          error.message?.toLowerCase().includes("not available");
    return res.status(isAccessError ? 503 : (error.statusCode || 500)).json({
      error: isAccessError
        ? "Veo 2 no está activado en tu cuenta de Google AI. Solicita acceso en ai.google.dev"
        : "No se pudo generar el vídeo",
      details: error instanceof Error ? error.message : "Error desconocido",
    });
  }
}

// ── Historial de chat / Chat history library ──────────────────────────────
// ES: Devuelve la lista de conversaciones de un usuario.
//     Query params opcionales: ?mode=teacher&limit=20
// EN: Returns the list of conversations for a user.
//     Optional query params: ?mode=teacher&limit=20
async function getChatHistory(req, res) {
  const userId = sanitizeUserId(req.params.userId);
  const mode   = req.query.mode  || null;
  const limit  = Math.min(parseInt(req.query.limit  || "50", 10), 200);
  return res.json(getHistory(userId, { mode, limit }));
}

// ES: Devuelve los mensajes completos de una conversación específica.
// EN: Returns the full messages of a specific conversation.
async function getChatConversation(req, res) {
  const userId = sanitizeUserId(req.params.userId);
  const convId = String(req.params.convId || "").trim();
  if (!convId) return res.status(400).json({ error: "Falta convId" });

  const conv = getConversation(userId, convId);
  if (!conv) return res.status(404).json({ error: "Conversación no encontrada" });

  return res.json(conv);
}

// ES: Elimina todo el historial de un usuario (requiere header X-Confirm: delete)
// EN: Deletes all history for a user (requires header X-Confirm: delete)
async function deleteChatHistory(req, res) {
  if (req.headers["x-confirm"] !== "delete") {
    return res.status(400).json({ error: "Añade el header X-Confirm: delete para confirmar el borrado" });
  }
  const userId = sanitizeUserId(req.params.userId);
  clearHistory(userId);
  return res.json({ ok: true, message: "Historial eliminado" });
}

// ES: Elimina una conversación específica del historial.
// EN: Deletes a specific conversation from the history.
async function deleteChatConversation(req, res) {
  const userId = sanitizeUserId(req.params.userId);
  const convId = String(req.params.convId || "").trim();
  if (!convId) return res.status(400).json({ error: "Falta convId" });

  const deleted = deleteConversation(userId, convId);
  if (!deleted) return res.status(404).json({ error: "Conversación no encontrada" });

  return res.json({ ok: true });
}

// ── Curiosidad del día / Fun fact of the day ───────────────────────────────
// ES: Devuelve un dato curioso aleatorio, opcionalmente filtrado por tema.
//     Query param ?topic=animales (o cualquier topic de la base de datos).
// EN: Returns a random fun fact, optionally filtered by topic.
//     Query param ?topic=animals (or any topic in the knowledge base).
async function getFactOfTheDay(req, res) {
  const topic = req.query.topic || null;
  const fact = getRandomFact(topic);
  if (!fact) {
    return res.status(404).json({ error: "No hay curiosidades para ese tema" });
  }
  return res.json({ fact: fact.fact, topic: fact.topic });
}

// ES: Devuelve estadísticas de la base de conocimientos (número de entradas
//     por asignatura/nivel).
// EN: Returns knowledge base statistics (number of entries per
//     subject / school level).
async function getKnowledgeInfo(req, res) {
  return res.json(getKnowledgeStats());
}

// ── analyzeDocument ────────────────────────────────────────────────────────
// ES: Analiza un archivo subido (PDF o imagen) usando la IA activa.
//     - PDF: extrae texto con pdf-parse y lo envía al chat como contexto.
//     - Imagen: envía el buffer base64 al proveedor con capacidad de visión.
// EN: Analyses an uploaded file (PDF or image) using the active AI.
//     - PDF: extracts text with pdf-parse and sends it as chat context.
//     - Image: sends the base64 buffer to the vision-capable provider.
async function analyzeDocument(req, res) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No se recibió ningún archivo." });
    }

    // ES: Validar tipo MIME
    // EN: Validate MIME type
    if (!ALLOWED_DOC_TYPES.has(file.mimetype)) {
      return res.status(400).json({
        error: "Tipo de archivo no soportado. Usa PDF, JPG, PNG, WEBP o GIF.",
      });
    }

    // ES: Validar tamaño
    // EN: Validate size
    if (file.size > MAX_DOC_SIZE_BYTES) {
      return res.status(413).json({ error: "El archivo supera el límite de 10 MB." });
    }

    const userId        = sanitizeUserId(req.body.userId || req.authUserId);
    const mode          = parseChildMode(req.body.mode);
    const rawQuestion   = String(req.body.question || "").trim().slice(0, MAX_TEXT_LENGTH);
    const question      = rawQuestion || "¿Qué hay en este documento? Resúmelo y explícalo de forma sencilla.";
    const isAdmin       = req.authUserRole === "admin";
    const isFriendMode  = mode === "friend";
    const skipCredit    = isFriendMode || isAdmin;

    // ES: Comprobar créditos antes del análisis costoso
    // EN: Check credits before the expensive analysis
    if (!skipCredit && !spendCredit(userId, 1)) {
      return res.status(402).json({ error: "Sin creditos diarios. Vuelve mañana." });
    }

    const systemInstruction = isAdmin
      ? buildLeaderInstruction(req.authUsername || "líder")
      : buildSystemInstruction(mode);

    let answer;

    if (file.mimetype === "application/pdf") {
      // ES: Extraer texto del PDF
      // EN: Extract text from PDF
      let pdfData;
      try {
        pdfData = await pdfParse(file.buffer);
      } catch {
        if (!skipCredit) refundCredit(userId, 1);
        return res.status(422).json({
          error: "No se pudo leer el PDF. ¿Está protegido con contraseña?",
        });
      }

      const extractedText = (pdfData.text || "").trim().slice(0, 6000);
      if (!extractedText) {
        if (!skipCredit) refundCredit(userId, 1);
        return res.status(422).json({
          error: "El PDF no tiene texto legible (puede ser un PDF de solo imágenes).",
        });
      }

      const prompt = `El usuario ha compartido un documento PDF. Contenido del documento:\n\n---\n${extractedText}\n---\n\nPregunta del usuario: ${question}`;
      const provider = getAIProvider();

      if (provider === "gemini") {
        const ai = getGeminiClient();
        const geminiModel = (process.env.GEMINI_MODEL || "gemini-2.0-flash").trim();
        const result = await ai.models.generateContent({
          model: geminiModel,
          contents: [{ parts: [{ text: prompt }] }],
          config: { systemInstruction },
        });
        answer = result.text?.trim();
      } else if (provider === "ollama") {
        answer = await chatWithOllama({
          messages: [
            { role: "system",  content: systemInstruction },
            { role: "user",    content: prompt },
          ],
        });
      } else {
        answer = await tfChat(prompt);
      }
    } else {
      // ES: Imagen → visión de IA
      // EN: Image → AI vision
      answer = await analyzeImageWithAI({
        imageBuffer: file.buffer,
        mimeType:    file.mimetype,
        question,
        systemInstruction,
      });
    }

    const remainingCredits = getUserCredits(userId);
    return res.json({
      answer: answer || "No pude analizar el documento.",
      remainingCredits,
    });
  } catch (error) {
    console.error("[analyzeDocument] Error:", error);
    const status = error.statusCode || 500;
    return res.status(status).json({
      error: error.message || "Error interno al analizar el documento.",
    });
  }
}

// ── Quiz / Modo Quiz ────────────────────────────────────────────────────────
// ES: Genera una pregunta de opción múltiple basada en el contexto reciente
//     del chat. Devuelve { question, options, answer }.
// EN: Generates a multiple-choice question based on recent chat context.
//     Returns { question, options, answer }.
async function generateQuiz(req, res) {
  const { context = "", language = "es" } = req.body || {};

  if (!context.trim()) {
    return res.status(400).json({ error: "context is required" });
  }

  const langNames = { es: "español", en: "English", fr: "français", it: "italiano" };
  const langName = langNames[language] || "español";

  const prompt = [
    { role: "user", content:
      `Basándote en esta conversación reciente:\n\n${context.slice(0, 1500)}\n\n` +
      `Genera UNA pregunta de cultura general o de lo que se habló, con exactamente 4 opciones (A, B, C, D). ` +
      `Responde en ${langName}. ` +
      `Responde ÚNICAMENTE con este JSON sin texto adicional:\n` +
      `{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"answer":"A) ..."}`
    },
  ];

  try {
    const provider = getAIProvider();
    let raw = "";

    if (provider === "gemini") {
      const ai = getGeminiClient();
      const result = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
        contents: prompt.map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.content }] })),
      });
      raw = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } else {
      raw = await chatWithOllama({ messages: prompt });
    }

    // ES: Extraer el JSON de la respuesta
    // EN: Extract JSON from the response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in AI response");
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.question || !Array.isArray(parsed.options) || !parsed.answer) {
      throw new Error("Invalid quiz format");
    }
    return res.json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || "No se pudo generar el quiz." });
  }
}

export {
  transcribeAudio,
  createChatResponse,
  createChatResponseStream,
  generateImage,
  generateVideo,
  analyzeDocument,
  getFactOfTheDay,
  getKnowledgeInfo,
  getChatHistory,
  getChatConversation,
  deleteChatHistory,
  deleteChatConversation,
  getSpontaneousMessage,
  generateQuiz,
};