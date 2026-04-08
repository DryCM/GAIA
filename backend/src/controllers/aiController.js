import { chatWithOllama, getAIProvider, getGeminiClient } from "../services/openaiService.js";
import { getUserCredits, refundCredit, spendCredit } from "../services/creditsService.js";

const MAX_TEXT_LENGTH = 2500;
const MAX_PROMPT_LENGTH = 3000;
const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_HISTORY_MESSAGES = 20;
const LOCAL_STT_BASE_URL = (process.env.LOCAL_STT_BASE_URL || "").trim();
const LOCAL_STT_MODEL = (process.env.LOCAL_STT_MODEL || "base").trim();
const LOCAL_IMAGE_BASE_URL = (process.env.LOCAL_IMAGE_BASE_URL || "").trim();

function sanitizeUserId(raw) {
  const value = String(raw || "anon").trim();
  if (!value) {
    return "anon";
  }

  return value.slice(0, 64);
}

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

async function createChatResponse(req, res) {
  let creditSpent = false;
  let userId = "anon";

  try {
    const provider = getAIProvider();
    const { userId: userIdInput = "anon", text = "", history = [] } = req.body ?? {};
    userId = sanitizeUserId(userIdInput);
    const parsedText = parseRequiredText(text, MAX_TEXT_LENGTH);

    if (!parsedText) {
      return res.status(400).json({ error: "Falta texto" });
    }

    if (!spendCredit(userId, 1)) {
      return res.status(402).json({ error: "Sin creditos diarios" });
    }
    creditSpent = true;

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

    if (provider === "ollama") {
      const ollamaMessages = [
        {
          role: "system",
          content:
            "Eres GaIA, una asistente virtual clara, util y amable. Responde siempre en espanol en 2 a 4 frases.",
        },
        ...historyMessages.map((m) => ({ role: m.role, content: m.text })),
        {
          role: "user",
          content: parsedText,
        },
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
        config: {
          systemInstruction:
            "Eres GaIA, una asistente virtual clara, util y amable. Responde siempre en espanol en 2 a 4 frases.",
        },
      });
      answer = completion.text?.trim() || answer;
    }

    const remaining = getUserCredits(userId).remaining;
    return res.json({
      answer,
      remainingCredits: remaining,
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

export { transcribeAudio, createChatResponse, generateImage };