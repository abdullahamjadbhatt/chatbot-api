import express from 'express';
import {
  listSessions,
  getSessionDetails,
  deleteSession,
  cleanupOldSessions,
  getSessionStats
} from '../controllers/sessionController.js';

const router = express.Router();

router.get('/sessions', listSessions);
router.get('/sessions/:sessionId', getSessionDetails);
router.delete('/sessions/:sessionId', deleteSession);
router.post('/sessions/cleanup', cleanupOldSessions);
router.get('/stats', getSessionStats);

export default router;