import express from 'express';
import { 
  handleChat, 
  getModels, 
  streamChat, 
  getHistory, 
  deleteHistory 
} from '../controllers/chatController.js';

const router = express.Router();

/**
 * @route   POST /api/chat
 * @desc    Send a message to the AI and get a response
 * @access  Public
 * @body    { 
 *            message: string (required),
 *            model: string (optional) - model identifier from /api/models,
 *            sessionId: string (optional) - for future MongoDB integration
 *          }
 */
router.post('/chat', handleChat);

/**
 * @route   GET /api/models
 * @desc    Get list of available Hugging Face models
 * @access  Public
 */
router.get('/models', getModels);

/**
 * @route   POST /api/chat/stream
 * @desc    Stream AI response token by token (bonus feature)
 * @access  Public
 * @body    { message: string, model: string (optional) }
 */
router.post('/chat/stream', streamChat);

/**
 * @route   GET /api/chat/history/:sessionId
 * @desc    Get chat history for a session (coming in Week 2 with MongoDB)
 * @access  Public
 */
router.get('/chat/history/:sessionId', getHistory);

/**
 * @route   DELETE /api/chat/history/:sessionId
 * @desc    Delete chat history for a session (coming in Week 2 with MongoDB)
 * @access  Public
 */
router.delete('/chat/history/:sessionId', deleteHistory);

export default router;