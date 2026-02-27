import Conversation from '../models/conversation.js';
import "colors";

/**
 * Get all active sessions with metadata
 */
export const getAllSessions = async (limit = 100, offset = 0) => {
  try {
    const sessions = await Conversation.aggregate([
      {
        $project: {
          sessionId: 1,
          userId: 1,
          createdAt: 1,
          updatedAt: 1,
          messageCount: { $size: '$messages' },
          lastMessage: { $arrayElemAt: ['$messages', -1] },
          totalTokens: { $sum: '$messages.tokens' }
        }
      },
      { $sort: { updatedAt: -1 } },
      { $skip: offset },
      { $limit: limit }
    ]);
    
    const total = await Conversation.countDocuments();
    
    return {
      sessions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + sessions.length < total
      }
    };
    
  } catch (error) {
    console.error('Error getting sessions:', error.red);
    throw error;
  }
};

/**
 * Get session summary with statistics
 */
export const getSessionSummary = async (sessionId) => {
  try {
    const conversation = await Conversation.findOne({ sessionId });
    
    if (!conversation) {
      return null;
    }
    
    const messages = conversation.messages;
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    
    return {
      sessionId: conversation.sessionId,
      userId: conversation.userId,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      stats: {
        totalMessages: messages.length,
        userMessages: userMessages.length,
        assistantMessages: assistantMessages.length,
        avgResponseTime: calculateAvgResponseTime(messages),
        totalTokens: messages.reduce((sum, m) => sum + (m.tokens || 0), 0)
      },
      preview: {
        firstMessage: messages[0]?.content.substring(0, 100),
        lastMessage: messages[messages.length - 1]?.content.substring(0, 100)
      }
    };
    
  } catch (error) {
    console.error('Error getting session summary:', error.red);
    throw error;
  }
};

/**
 * Calculate average response time (if you store timestamps properly)
 */
const calculateAvgResponseTime = (messages) => {
  let totalTime = 0;
  let pairs = 0;
  
  for (let i = 0; i < messages.length - 1; i++) {
    if (messages[i].role === 'user' && messages[i + 1].role === 'assistant') {
      const timeDiff = messages[i + 1].timestamp - messages[i].timestamp;
      totalTime += timeDiff;
      pairs++;
    }
  }
  
  return pairs > 0 ? totalTime / pairs : 0;
};

/**
 * Delete old sessions (for cleanup)
 */
export const deleteOldSessions = async (daysOld = 30) => {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  const result = await Conversation.deleteMany({
    updatedAt: { $lt: cutoffDate }
  });
  
  return {
    deletedCount: result.deletedCount,
    cutoffDate
  };
};