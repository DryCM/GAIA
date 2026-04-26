import { Router } from "express";
import {
  createChatResponse,
  createChatResponseStream,
  generateImage,
  generateVideo,
  transcribeAudio,
  analyzeDocument,
  getFactOfTheDay,
  getKnowledgeInfo,
  getChatHistory,
  getChatConversation,
  deleteChatHistory,
  deleteChatConversation,
  getSpontaneousMessage,
  generateQuiz,
} from "../controllers/aiController.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = Router();

// ES: Endpoints de chat y multimedia / EN: Chat and media endpoints
router.post("/transcribe",        upload.single("file"), transcribeAudio);
router.post("/chat",              createChatResponse);
router.post("/chat/stream",       createChatResponseStream);
router.post("/images",            generateImage);
router.post("/videos",            generateVideo);
router.post("/analyze-document",  upload.single("file"), analyzeDocument);

// ES: Mensaje espontáneo del modo amigo (sin crédito, sin autenticación requerida)
// EN: Spontaneous message for friend mode (no credit, no auth required)
router.get("/spontaneous",  getSpontaneousMessage);

// ES: Quiz basado en conversación reciente
// EN: Quiz based on recent conversation
router.post("/chat/quiz", generateQuiz);

// ES: Endpoints de conocimiento / EN: Knowledge endpoints
router.get("/knowledge/fact",   getFactOfTheDay);
router.get("/knowledge/stats",  getKnowledgeInfo);

// ES: Biblioteca de historial de chats / EN: Chat history library
// GET    /api/ai/history/:userId            → lista de conversaciones
// GET    /api/ai/history/:userId/:convId    → mensajes de una conversación
// DELETE /api/ai/history/:userId            → borrar todo el historial (X-Confirm: delete)
// DELETE /api/ai/history/:userId/:convId   → borrar una conversación
router.get(   "/history/:userId",           getChatHistory);
router.get(   "/history/:userId/:convId",   getChatConversation);
router.delete("/history/:userId",           deleteChatHistory);
router.delete("/history/:userId/:convId",   deleteChatConversation);

export default router;