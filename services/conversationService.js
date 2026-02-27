import Conversation from '../models/conversation.js';
import "colors";

/**
 * Add a message to a conversation
 */
export const addMessage = async (sessionId, role, content, model, metadata = {}) => {
  try {
    // Find or create conversation
    let conversation = await Conversation.findOne({ sessionId });
    
    if (!conversation) {
      conversation = new Conversation({
        sessionId,
        userId: metadata.userId || 'anonymous',
        messages: [],
        metadata: {
          userAgent: metadata.userAgent,
          ipAddress: metadata.ipAddress
        }
      });
    }
    
    // Add new message
    conversation.messages.push({
      role,
      content,
      model,
      timestamp: new Date()
    });
    
    await conversation.save();
    return conversation;
    
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
};

/**
 * Get conversation history
 */
export const getConversation = async (sessionId, limit = 50) => {
  try {
    const conversation = await Conversation.findOne({ sessionId });
    
    if (!conversation) {
      return { messages: [], sessionId };
    }
    
    // Return last 'limit' messages
    const messages = conversation.messages.slice(-limit);
    
    return {
      sessionId: conversation.sessionId,
      userId: conversation.userId,
      messages,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt
    };
    
  } catch (error) {
    console.error('Error getting conversation:', error.red);
    throw error;
  }
};

/**
 * Get all conversations for a user (admin/debug)
 */
export const getUserConversations = async (userId, page = 0, limit = 10) => {
  try {
    const skip = page * limit;
    
    const conversations = await Conversation.find({ userId })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('sessionId updatedAt messages.$'); // Only latest message
    
    const total = await Conversation.countDocuments({ userId });
    
    return {
      conversations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
    
  } catch (error) {
    console.error('Error getting user conversations:', error.red);
    throw error;
  }
};

/**
 * Delete conversation
 */
export const deleteConversation = async (sessionId) => {
  try {
    const result = await Conversation.deleteOne({ sessionId });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting conversation:', error.red);
    throw error;
  }
};