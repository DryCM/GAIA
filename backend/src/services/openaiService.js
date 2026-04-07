import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY no configurada. El backend iniciara pero endpoints de IA fallaran.");
}

let openaiClient;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY no configurada");
    error.statusCode = 503;
    throw error;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return openaiClient;
}

export { getOpenAIClient };