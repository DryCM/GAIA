/* ================================================================
   GaIA AI Provider Service / Servicio de proveedor de IA
   ES: Abstrae los dos proveedores de IA soportados:
       - Ollama (local, gratis): modelos locales como llama3.2
       - Gemini (nube, Google): requiere GEMINI_API_KEY
   EN: Abstracts the two supported AI providers:
       - Ollama (local, free): local models such as llama3.2
       - Gemini (cloud, Google): requires GEMINI_API_KEY
   ================================================================ */

import { GoogleGenAI } from "@google/genai";

// ES: Leer configuración del proveedor desde variables de entorno.
//     Por defecto usa TensorFlow (local, sin dependencias externas).
// EN: Read provider config from environment variables.
//     Defaults to TensorFlow (local, no external dependencies).
const aiProvider = (process.env.AI_PROVIDER || "tensorflow").trim().toLowerCase();
const ollamaBaseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").trim();
const ollamaChatModel = (process.env.OLLAMA_CHAT_MODEL || "llama3.2:latest").trim();

// ES: Advertir en arranque si falta la clave de Gemini para evitar
//     errores silenciosos en producción.
// EN: Warn at startup if the Gemini key is missing to avoid
//     silent failures in production.
if (aiProvider === "gemini" && !process.env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY no configurada. El backend iniciara pero endpoints de IA fallaran.");
}

// ES: Cliente Gemini (se crea solo una vez por proceso, patrón singleton).
// EN: Gemini client (created only once per process, singleton pattern).
let geminiClient;

// ES: Valida y devuelve el nombre del proveedor activo.
//     Lanza error 500 si el valor en .env es desconocido.
// EN: Validates and returns the active provider name.
//     Throws a 500 error if the .env value is unknown.
function getAIProvider() {
  if (aiProvider !== "ollama" && aiProvider !== "gemini" && aiProvider !== "tensorflow") {
    const error = new Error("AI_PROVIDER invalido. Usa 'ollama', 'gemini' o 'tensorflow'.");
    error.statusCode = 500;
    throw error;
  }

  return aiProvider;
}

// ES: Devuelve (o crea) el cliente de Google Gemini.
//     Lanza error 503 si no hay API key configurada.
// EN: Returns (or creates) the Google Gemini client.
//     Throws a 503 error if no API key is configured.
function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    const error = new Error("GEMINI_API_KEY no configurada");
    error.statusCode = 503;
    throw error;
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  return geminiClient;
}

// ES: Envía los mensajes al servidor Ollama local y devuelve
//     el texto de respuesta. Lanza error 502 si Ollama no responde.
// EN: Sends messages to the local Ollama server and returns
//     the response text. Throws 502 if Ollama does not respond.
async function chatWithOllama({ messages }) {
  const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ollamaChatModel,   // ES: modelo configurado en .env / EN: model set in .env
      messages,
      stream: false,            // ES: respuesta completa, sin streaming / EN: full response, no streaming
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`Ollama fallo (${response.status}): ${body || "sin detalle"}`);
    error.statusCode = 502;
    throw error;
  }

  const data = await response.json();
  // ES: Extraer el texto de la respuesta, con fallback amigable.
  // EN: Extract the response text with a friendly fallback.
  return data?.message?.content?.trim() || "No pude responder ahora mismo.";
}

// ES: Envía mensajes a Ollama en modo streaming y llama onToken con cada fragmento.
//     Devuelve el texto completo acumulado al terminar.
// EN: Sends messages to Ollama in streaming mode and calls onToken with each fragment.
//     Returns the full accumulated text when finished.
async function chatWithOllamaStream({ messages, onToken }) {
  const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: ollamaChatModel, messages, stream: true }),
  });

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`Ollama streaming fallo (${response.status}): ${body || "sin detalle"}`);
    error.statusCode = 502;
    throw error;
  }

  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText  = "";
  let buffer    = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data  = JSON.parse(line);
        const token = data?.message?.content ?? "";
        if (token) { fullText += token; onToken(token); }
      } catch { /* saltar línea malformada / skip malformed line */ }
    }
  }

  // ES: Procesar cualquier fragmento pendiente en el buffer
  // EN: Process any pending fragment left in the buffer
  if (buffer.trim()) {
    try {
      const data  = JSON.parse(buffer);
      const token = data?.message?.content ?? "";
      if (token) { fullText += token; onToken(token); }
    } catch {}
  }

  return fullText || "No pude responder ahora mismo.";
}

// ES: Envía mensajes a Gemini en modo streaming y llama onToken con cada fragmento.
//     Devuelve el texto completo acumulado al terminar.
// EN: Sends messages to Gemini in streaming mode and calls onToken with each fragment.
//     Returns the full accumulated text when finished.
async function chatWithGeminiStream({ ai, model, contents, config, onToken }) {
  const stream = await ai.models.generateContentStream({ model, contents, config });
  let fullText = "";
  for await (const chunk of stream) {
    const token = chunk.text ?? "";
    if (token) { fullText += token; onToken(token); }
  }
  return fullText || "No pude responder ahora mismo.";
}

// ES: Modelo Ollama con capacidad de visión (configurable via OLLAMA_VISION_MODEL).
// EN: Ollama model with vision capability (configurable via OLLAMA_VISION_MODEL).
const ollamaVisionModel = (process.env.OLLAMA_VISION_MODEL || "").trim() || ollamaChatModel;

// ES: Envía una imagen al proveedor de IA activo y devuelve la descripción.
//     - Gemini: usa inlineData con base64.
//     - Ollama: usa el campo images del endpoint /api/chat.
//     - TensorFlow: no soporta visión, lanza 501.
// EN: Sends an image to the active AI provider and returns a description.
//     - Gemini: uses inlineData with base64.
//     - Ollama: uses the images field of /api/chat endpoint.
//     - TensorFlow: vision not supported, throws 501.
async function analyzeImageWithAI({ imageBuffer, mimeType, question, systemInstruction }) {
  const provider = getAIProvider();

  if (provider === "gemini") {
    const ai = getGeminiClient();
    const geminiModel = (process.env.GEMINI_MODEL || "gemini-2.0-flash").trim();
    const result = await ai.models.generateContent({
      model: geminiModel,
      contents: [
        {
          parts: [
            { inlineData: { mimeType, data: imageBuffer.toString("base64") } },
            { text: question },
          ],
        },
      ],
      config: { systemInstruction },
    });
    return result.text?.trim() || "No pude analizar la imagen.";
  }

  if (provider === "ollama") {
    const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaVisionModel,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: question, images: [imageBuffer.toString("base64")] },
        ],
        stream: false,
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      const err = new Error(`Ollama vision fallo (${response.status}): ${body || "sin detalle"}`);
      err.statusCode = 502;
      throw err;
    }
    const data = await response.json();
    return data?.message?.content?.trim() || "No pude analizar la imagen.";
  }

  // tensorflow: sin soporte de visión
  const err = new Error(
    "El proveedor actual no soporta análisis de imágenes. Activa Gemini o un modelo Ollama con visión (llava)."
  );
  err.statusCode = 501;
  throw err;
}

export { getAIProvider, getGeminiClient, chatWithOllama, chatWithOllamaStream, chatWithGeminiStream, analyzeImageWithAI };