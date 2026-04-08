import { GoogleGenAI } from "@google/genai";

const aiProvider = (process.env.AI_PROVIDER || "ollama").trim().toLowerCase();
const ollamaBaseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").trim();
const ollamaChatModel = (process.env.OLLAMA_CHAT_MODEL || "llama3.2:latest").trim();

if (aiProvider === "gemini" && !process.env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY no configurada. El backend iniciara pero endpoints de IA fallaran.");
}

let geminiClient;

function getAIProvider() {
  if (aiProvider !== "ollama" && aiProvider !== "gemini") {
    const error = new Error("AI_PROVIDER invalido. Usa 'ollama' o 'gemini'.");
    error.statusCode = 500;
    throw error;
  }

  return aiProvider;
}

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

async function chatWithOllama({ messages }) {
  const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ollamaChatModel,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`Ollama fallo (${response.status}): ${body || "sin detalle"}`);
    error.statusCode = 502;
    throw error;
  }

  const data = await response.json();
  return data?.message?.content?.trim() || "No pude responder ahora mismo.";
}

export { getAIProvider, getGeminiClient, chatWithOllama };