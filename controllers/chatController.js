import 'colors';
import { generateResponse, AVAILABLE_MODELS, getModelInfo } from '../services/aiService.js';
import { addMessage, getConversation, deleteConversation } from '../services/conversationService.js';
import { buildSmartContextPrompt } from '../services/summarizerService.js';
import { countTokens, getModelLimit } from '../services/tokenCounter.js';

/**
 * Get list of available models
 */
export const getModels = async (req, res) => {
  try {
    const modelsList = Object.keys(AVAILABLE_MODELS).map(key => getModelInfo(key));
    
    res.json({
      success: true,
      default_model: "deepseek-v3.2",
      models: modelsList
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch models' });
  }
};

/**
 * Build a conversation history string for context
 */
const buildContextPrompt = (messages, currentMessage) => {
  if (!messages || messages.length === 0) {
    return currentMessage; // No history, just return the current message
  }

  // Take last 5 messages for context (to avoid token limits)
  const recentMessages = messages.slice(-5);
  
  // Format the conversation history
  let contextPrompt = "Previous conversation:\n";
  
  recentMessages.forEach(msg => {
    const role = msg.role === 'user' ? 'User' : 'Assistant';
    contextPrompt += `${role}: ${msg.content}\n`;
  });
  
  // Add the current message
  contextPrompt += `User: ${currentMessage}\nAssistant:`;
  
  return contextPrompt;
};

/**
 * Handle chat requests with Hugging Face
 */
export const handleChat = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { message, model = "deepseek-v3.2", sessionId = `session_${Date.now()}` } = req.body;
    
    // Validation
    if (!message) {
      return res.status(400).json({ 
        error: 'Message is required',
        example: { message: 'Hello, AI!' }
      });
    }
    
    if (typeof message !== 'string') {
      return res.status(400).json({ error: 'Message must be a string' });
    }
    
    if (message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    
    // Validate model if provided
    if (model && !AVAILABLE_MODELS[model]) {
      return res.status(400).json({ 
        error: 'Invalid model',
        message: `Model '${model}' not found. Available models: ${Object.keys(AVAILABLE_MODELS).join(', ')}`,
        available_models: Object.keys(AVAILABLE_MODELS)
      });
    }
    
    console.log(`[${sessionId}] Request: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`.blue);
    console.log(`Using model: ${model} (${AVAILABLE_MODELS[model]})`.blue);

    // Store user message
    await addMessage(sessionId, 'user', message, model, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    });
    
    // Get conversation history for context
    const history = await getConversation(sessionId, 50); // Last 10 messages for context

    // Build smart context prompt
    const contextualizedMessage = await buildSmartContextPrompt(
      history.messages, 
      message, 
      model
    );
    
    // Count tokens for logging
    const promptTokens = countTokens(contextualizedMessage);
    const modelLimit = getModelLimit(model);
    
    console.log(`Context stats: ${history.messages.length} messages, ~${promptTokens}/${modelLimit} tokens`.blue);
    
    // Generate AI response with context
    const aiResponse = await generateResponse(contextualizedMessage, model);

    // Store AI response
    await addMessage(sessionId, 'assistant', aiResponse, model);
    
    const responseTime = Date.now() - startTime;
    console.log(`[${sessionId}] Response generated in ${responseTime}ms`.blue);
    
    // Return response with enhanced metadata
    res.json({
      success: true,
      response: aiResponse,
      model_used: {
        id: model,
        full_id: AVAILABLE_MODELS[model]
      },
      session_id: sessionId,
      message_count: history.messages.length + 1,
      context: {
        messages_used: Math.min(history.messages.length, 50),
        tokens_used: promptTokens,
        model_limit: modelLimit,
        usage_percent: Math.round((promptTokens / modelLimit) * 100)
      },
      metadata: {
        response_time_ms: responseTime,
        timestamp: new Date().toISOString(),
        message_length: message.length,
        response_length: aiResponse.length
      }
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    
    // Determine if it's a known error type
    const statusCode = error.message.includes('API key') ? 401 :
                      error.message.includes('Rate limit') ? 429 :
                      error.message.includes('Model is loading') ? 503 : 500;
    
    res.status(statusCode).json({ 
      success: false,
      error: 'Failed to process chat message',
      message: error.message,
      tip: statusCode === 503 ? 'Try again in a few seconds - the model is warming up' :
           statusCode === 429 ? 'Rate limit hit. Wait a moment and try again' :
           'Check your API key or try a different model',
      available_models: Object.keys(AVAILABLE_MODELS)
    });
  }
};

/**
 * Streaming version (keep from Day 1)
 */
export const streamChat = async (req, res) => {
  try {
    const { message, model = "deepseek-v3.2", sessionId = `session_${Date.now()}` } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Store user message
    await addMessage(sessionId, 'user', message, model);
    
    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Send initial event
    res.write(`data: ${JSON.stringify({ event: 'start', model, sessionId })}\n\n`);
    
    // Generate response
    const aiResponse = await generateResponse(message, model);
    const words = aiResponse.split(' ');
    
    // Stream tokens
    for (const word of words) {
      res.write(`data: ${JSON.stringify({ event: 'token', token: word + ' ' })}\n\n`);
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    
    // Store AI response
    await addMessage(sessionId, 'assistant', aiResponse, model);
    
    res.write(`data: ${JSON.stringify({ event: 'done', sessionId })}\n\n`);
    res.end();
    
  } catch (error) {
    console.error('Streaming error:', error.red);
    res.write(`data: ${JSON.stringify({ event: 'error', error: error.message })}\n\n`);
    res.end();
  }
};

/**
 * Get conversation history
 */
export const getHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const history = await getConversation(sessionId, limit);
    
    res.json({
      success: true,
      ...history
    });
    
  } catch (error) {
    console.error('History error:', error.red);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
};

/**
 * Delete conversation
 */
export const deleteHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const deleted = await deleteConversation(sessionId);
    
    if (deleted) {
      res.json({
        success: true,
        message: `Conversation ${sessionId} deleted`
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }
    
  } catch (error) {
    console.error('Delete error:', error.red);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
};