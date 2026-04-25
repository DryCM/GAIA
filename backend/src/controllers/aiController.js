/* ================================================================
   GaIA AI Controller / Controlador de IA
   ES: Gestiona los tres flujos principales de IA:
       1. Chat de texto  – createChatResponse
       2. Transcripción  – transcribeAudio
       3. Generación de imagen – generateImage
   EN: Handles the three main AI flows:
       1. Text chat       – createChatResponse
       2. Transcription   – transcribeAudio
       3. Image generation – generateImage
   ================================================================ */

import { chatWithOllama, getAIProvider, getGeminiClient } from "../services/openaiService.js";
import { getUserCredits, refundCredit, spendCredit } from "../services/creditsService.js";
import { learnFromMessage, buildPersonalizedPrompt, responseCache, detectCreativity } from "../services/learningService.js";
import { getProfile, recordInteraction, recordCreativity, hasConsent } from "../services/userProfileService.js";
import { findKnowledge, getRandomFact, getKnowledgeStats } from "../services/knowledgeService.js";
import { webSearch, needsWebSearch, extractSearchQuery } from "../services/webSearchService.js";
import { appendMessages, getHistory, getConversation, clearHistory, deleteConversation } from "../services/chatHistoryService.js";
import { tfChat } from "../services/tfChatService.js";

// ES: Límites de seguridad para entradas del usuario
// EN: Safety limits for user inputs
const MAX_TEXT_LENGTH = 2500;                    // ES: carácteres máx por mensaje / EN: max chars per message
const MAX_PROMPT_LENGTH = 3000;                  // ES: carácteres máx para prompt de imagen / EN: max chars for image prompt
const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024;  // ES: 25 MB máx para audio / EN: 25 MB max for audio
const MAX_HISTORY_MESSAGES = 20;                 // ES: máx mensajes del historial a enviar a la IA / EN: max history messages sent to AI
// ES: URL del servidor de transcripción local (opcional)
// EN: URL of the local transcription server (optional)
const LOCAL_STT_BASE_URL = (process.env.LOCAL_STT_BASE_URL || "").trim();
const LOCAL_STT_MODEL = (process.env.LOCAL_STT_MODEL || "base").trim();
// ES: URL del motor de imagen local tipo Automatic1111 (opcional)
// EN: URL of the local image engine like Automatic1111 (optional)
const LOCAL_IMAGE_BASE_URL = (process.env.LOCAL_IMAGE_BASE_URL || "").trim();
// ES: Modos de habla disponibles del asistente para niños
// EN: Available speech modes for the children's assistant
const CHILD_MODES = new Set([
  "teacher",       // ES: maestra paciente paso a paso / EN: patient step-by-step teacher
  "friend",        // ES: amiga divertida con retos / EN: fun friend with challenges
  "storyteller",   // ES: cuentacuentos dramático / EN: dramatic storyteller
  "scientist",     // ES: científico curioso con experimentos / EN: curious scientist with experiments
  "adventurer",    // ES: explorador de aventuras y misiones / EN: adventure & mission explorer
  "comedian",      // ES: payaso amable con chistes limpios / EN: friendly clown with clean jokes
  "poet",          // ES: poeta que habla en rimas / EN: poet who speaks in rhymes
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

// ES: Valida el modo del asistente; usa 'teacher' como valor seguro
//     si el valor recibido no es válido.
// EN: Validates the assistant mode; falls back to 'teacher' as the
//     safe default if the received value is invalid.
function parseChildMode(value) {
  const parsed = String(value || "teacher").trim().toLowerCase();
  if (CHILD_MODES.has(parsed)) {
    return parsed;
  }

  return "teacher";
}

// ES: Construye el prompt de sistema básico (sin personalización por
//     perfil). Varía entre modo maestro y modo amigo.
// EN: Builds the basic system prompt (without profile personalisation).
//     Varies between teacher mode and friend mode.
function buildSystemInstruction(mode) {
  const base =
    "Eres GaIA para ninos. Usa espanol sencillo, tono positivo y respuestas cortas (2 a 4 frases). Evita contenido peligroso, sexual, violento o de odio. Si el usuario pide algo riesgoso, rechaza con calma y propone una alternativa segura o pedir ayuda a un adulto.";

  switch (mode) {
    case "friend":
      return `${base} Habla como una amiga divertida: propon juegos educativos cortos, retos creativos y celebraciones de logro.`;

    case "storyteller":
      // ES: Cuentacuentos dramático con suspenso y finales felices
      // EN: Dramatic storyteller with suspense and happy endings
      return `${base} Eres un narrador de cuentos magicos. Usa voz dramatica, crea personajes divertidos, incluye pequeñas aventuras con suspense y siempre termina con una leccion positiva o un final feliz. Usa frases como 'Y entonces...' o '¡Pero de repente...'.`;

    case "scientist":
      // ES: Científico curioso que propone mini-experimentos
      // EN: Curious scientist who proposes mini-experiments
      return `${base} Eres un cientifico muy curioso y entusiasta. Explica con datos sorprendentes, propone mini-experimentos caseros seguros, usa analogias simples y siempre termina con '¿Quieres saber mas sobre este experimento?'.`;

    case "adventurer":
      // ES: Explorador que convierte cada pregunta en una misión
      // EN: Explorer who turns every question into a mission
      return `${base} Eres un explorador de aventuras. Convierte cada pregunta en una mision emocionante, usa lenguaje de expedicion ('¡Exploremos!', '¡Mision aceptada!'), describe lugares como si fueras alli y propone un reto de exploracion al final.`;

    case "comedian":
      // ES: Payaso amable con humor limpio apropiado para niños
      // EN: Friendly clown with clean child-appropriate humor
      return `${base} Eres un payaso amable y gracioso. Usa humor limpio y apropiado para ninos, incluye un chiste corto o adivinanza relacionada con el tema, celebra con '¡Tachaan!' y mantiene todo divertido sin nunca burlarte de nadie.`;

    case "poet":
      // ES: Poeta que responde en rimas sencillas
      // EN: Poet who responds in simple rhymes
      return `${base} Eres un poeta que habla en rimas sencillas y bonitas. Responde con pequeños poemas o canciones de 4 a 6 versos. Usa palabras que rimen, ritmo alegre y siempre incluye una imagen colorida o divertida en el poema.`;

    default: // "teacher"
      return `${base} Habla como una maestra paciente: explica paso a paso con mini-ejemplos y termina con una pregunta de repaso.`;
  }
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
    const childMode = parseChildMode(mode);
    const parsedText = parseRequiredText(text, MAX_TEXT_LENGTH);

    if (!parsedText) {
      return res.status(400).json({ error: "Falta texto" });
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

    // ES: Prompt personalizado si el usuario tiene perfil con consentimiento
    // EN: Personalised prompt if the user has a profile with consent
    const profile = getProfile(userId);
    let systemInstruction = profile && hasConsent(userId, "personalization")
      ? buildPersonalizedPrompt(childMode, profile.age, profile.interests)
      : buildSystemInstruction(childMode);

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

    if (!spendCredit(userId, 1)) {
      return res.status(402).json({ error: "Sin creditos diarios" });
    }
    creditSpent = true;

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

    let answer = "No pude responder ahora mismo.";

    if (provider === "tensorflow") {
      // ES: Proveedor local TF.js — razona con TF-IDF y busca en internet
      //     automáticamente cuando la confianza local es baja. Sin IA externa.
      // EN: Local TF.js provider — reasons with TF-IDF and searches the
      //     internet automatically when local confidence is low. No external AI.
      const tfResult = await tfChat({ text: parsedText, mode: childMode, history: historyMessages });
      answer = tfResult.answer;
      webSearchContext = tfResult.webSearchUsed ? "__tf_internal__" : null;
    } else if (provider === "ollama") {
      const ollamaMessages = [
        { role: "system", content: systemInstruction },
        ...historyMessages.map((m) => ({ role: m.role, content: m.text })),
        { role: "user",   content: parsedText },
      ];
      answer = await chatWithOllama({ messages: ollamaMessages });
    } else {
      const ai = getGeminiClient();
      const contents = [
        ...historyMessages.map((m) => ({
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

export {
  transcribeAudio,
  createChatResponse,
  generateImage,
  generateVideo,
  getFactOfTheDay,
  getKnowledgeInfo,
  getChatHistory,
  getChatConversation,
  deleteChatHistory,
  deleteChatConversation,
};