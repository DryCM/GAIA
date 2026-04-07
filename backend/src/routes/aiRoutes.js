import { Router } from "express";
import { createChatResponse, generateImage, transcribeAudio } from "../controllers/aiController.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = Router();

router.post("/transcribe", upload.single("file"), transcribeAudio);
router.post("/chat", createChatResponse);
router.post("/images", generateImage);

export default router;