import { getProviderTaskHistory } from '../controllers/providerTaskHistoryController.js';
import { protect } from '../middleware/authMiddleware.js';
import { getDurationTaskCatalog } from '../clients/mlPredictionClient.js';
import express from "express";
import { estimateDuration } from "../controllers/durationController.js";

const router = express.Router();

router.get('/model-tasks', async (req, res) => {
  try { return res.json({ success: true, data: await getDurationTaskCatalog() }); }
  catch { return res.status(503).json({ message: 'Model task catalog is unavailable.' }); }
});

router.get('/provider-task-history', protect(['ServiceProvider']), getProviderTaskHistory);

router.post("/estimate", estimateDuration);

export default router;