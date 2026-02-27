import { getAllSessions, getSessionSummary, deleteOldSessions } from '../services/sessionService.js';
import Conversation from '../models/conversation.js';

/**
 * List all active sessions
 */
export const listSessions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const result = await getAllSessions(limit, offset);
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('List sessions error:', error.red);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
};

/**
 * Get detailed session information
 */
export const getSessionDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const summary = await getSessionSummary(sessionId);
    
    if (!summary) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({
      success: true,
      ...summary
    });
    
  } catch (error) {
    console.error('Session details error:', error.red);
    res.status(500).json({ error: 'Failed to get session details' });
  }
};

/**
 * Delete a specific session
 */
export const deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await Conversation.deleteOne({ sessionId });
    
    if (result.deletedCount > 0) {
      res.json({
        success: true,
        message: `Session ${sessionId} deleted`
      });
    } else {
      res.status(404).json({ error: 'Session not found' });
    }
    
  } catch (error) {
    console.error('Delete session error:', error.red);
    res.status(500).json({ error: 'Failed to delete session' });
  }
};

/**
 * Clean up old sessions
 */
export const cleanupOldSessions = async (req, res) => {
  try {
    const daysOld = parseInt(req.query.days) || 30;
    
    const result = await deleteOldSessions(daysOld);
    
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} sessions older than ${daysOld} days`,
      ...result
    });
    
  } catch (error) {
    console.error('Cleanup error:', error.red);
    res.status(500).json({ error: 'Failed to clean up sessions' });
  }
};

/**
 * Get global session statistics
 */
export const getSessionStats = async (req, res) => {
  try {
    const stats = await Conversation.aggregate([
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalMessages: { $sum: { $size: '$messages' } },
          totalTokens: { $sum: '$metadata.totalTokens' },
          avgMessagesPerSession: { $avg: { $size: '$messages' } },
          avgTokensPerSession: { $avg: '$metadata.totalTokens' },
          lastActivity: { $max: '$updatedAt' },
          earliestActivity: { $min: '$createdAt' }
        }
      }
    ]);
    
    const modelBreakdown = await Conversation.aggregate([
      { $unwind: '$messages' },
      {
        $group: {
          _id: '$messages.model',
          count: { $sum: 1 },
          tokens: { $sum: '$messages.tokens' }
        }
      }
    ]);
    
    res.json({
      success: true,
      global: stats[0] || {
        totalSessions: 0,
        totalMessages: 0,
        totalTokens: 0
      },
      modelBreakdown
    });
    
  } catch (error) {
    console.error('Stats error:', error.red);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
};