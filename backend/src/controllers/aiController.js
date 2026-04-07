import { toFile } from "openai/uploads";
import { getOpenAIClient } from "../services/openaiService.js";
import { getUserCredits, refundCredit, spendCredit } from "../services/creditsService.js";

const MAX_TEXT_LENGTH = 2500;
const MAX_PROMPT_LENGTH = 3000;
const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024;

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

async function transcribeAudio(req, res) {
  let creditSpent = false;
  let userId = "anon";

  try {
    const openai = getOpenAIClient();
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

    if (!spendCredit(userId, 1)) {
      return res.status(402).json({ error: "Sin creditos diarios" });
    }
    creditSpent = true;

    const audioFile = await toFile(req.file.buffer, req.file.originalname || "speech.m4a", {
      type: req.file.mimetype || "audio/m4a",
    });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "es",
    });

    const remaining = getUserCredits(userId).remaining;
    return res.json({ text: transcription.text, remainingCredits: remaining });
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
    const openai = getOpenAIClient();
    const { userId: userIdInput = "anon", text = "" } = req.body ?? {};
    userId = sanitizeUserId(userIdInput);
    const parsedText = parseRequiredText(text, MAX_TEXT_LENGTH);

    if (!parsedText) {
      return res.status(400).json({ error: "Falta texto" });
    }

    if (!spendCredit(userId, 1)) {
      return res.status(402).json({ error: "Sin creditos diarios" });
    }
    creditSpent = true;

    const completion = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content:
            "Eres GaIA, una asistente virtual clara, util y amable. Responde siempre en espanol en 2 a 4 frases.",
        },
        {
          role: "user",
          content: parsedText,
        },
      ],
    });

    const remaining = getUserCredits(userId).remaining;
    return res.json({
      answer: completion.output_text || "No pude responder ahora mismo.",
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
    const openai = getOpenAIClient();
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

    const imageResult = await openai.images.generate({
      model: "gpt-image-1",
      prompt: parsedPrompt,
      size: "1024x1024",
    });

    const b64 = imageResult.data?.[0]?.b64_json;
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