import "colors";
import { generateResponse, AVAILABLE_MODELS, getModelInfo } from '../services/aiService.js';

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
 * Handle chat requests with Hugging Face
 */
export const handleChat = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { message, model = "deepseek-v3.2", sessionId = "anonymous" } = req.body;
    
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
    
    // Generate AI response
    const aiResponse = await generateResponse(message, model);
    
    const responseTime = Date.now() - startTime;
    console.log(`[${sessionId}] Response generated in ${responseTime}ms`.blue);
    
    // Return response with metadata
    res.json({
      success: true,
      response: aiResponse,
      model_used: {
        id: model,
        full_id: AVAILABLE_MODELS[model]
      },
      session_id: sessionId,
      metadata: {
        response_time_ms: responseTime,
        timestamp: new Date().toISOString(),
        message_length: message.length,
        response_length: aiResponse.length
      }
    });
    
  } catch (error) {
    console.error('Chat error:', error.red);
    
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
 * Streaming version (bonus feature for Week 4)
 * This sends tokens one by one as they arrive
 */
export const streamChat = async (req, res) => {
  try {
    const { message, model = "deepseek" } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Send initial event
    res.write(`data: ${JSON.stringify({ event: 'start', model })}\n\n`);
    
    // Here you would implement actual streaming with Hugging Face
    // For now, send a simulated stream
    const aiResponse = await generateResponse(message, model);
    const words = aiResponse.split(' ');
    
    for (const word of words) {
      res.write(`data: ${JSON.stringify({ event: 'token', token: word + ' ' })}\n\n`);
      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    res.write(`data: ${JSON.stringify({ event: 'done' })}\n\n`);
    res.end();
    
  } catch (error) {
    console.error('Streaming error:', error.red);
    res.write(`data: ${JSON.stringify({ event: 'error', error: error.message })}\n\n`);
    res.end();
  }
};