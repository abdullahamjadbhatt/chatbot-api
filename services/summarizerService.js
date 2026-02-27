import {generateResponse} from './aiService.js';
import { countTokens, getModelLimit } from './tokenCounter.js';
import 'colors';

/**
 * Summarize a conversation
 */
export const summarizeConversation = async (messages, modelKey = 'deepseek-v3.2') => {
  if (!messages || messages.length === 0) {
    return null;
  }
  
  // Build conversation text
  const conversationText = messages.map(m => 
    `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
  ).join('\n');
  
  // Check if summarization is needed (conversation too long)
  const tokenCount = countTokens(conversationText);
  const modelLimit = getModelLimit(modelKey);
  
  if (tokenCount < modelLimit * 0.7) {
    // Conversation is short enough, no need to summarize
    return {
      needsSummarization: false,
      summary: null,
      tokenCount
    };
  }
  
  // Create summarization prompt
  const summaryPrompt = `Please summarize the following conversation in 2-3 sentences, capturing the key information, user preferences, and important context:

${conversationText}

Summary:`;
  
  try {
    const summary = await generateResponse(summaryPrompt, modelKey, {
      temperature: 0.3,
      maxTokens: 200
    });
    
    return {
      needsSummarization: true,
      summary: summary,
      tokenCount,
      summarizedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Summarization failed:', error.red);
    return {
      needsSummarization: true,
      summary: null,
      error: error.message,
      tokenCount
    };
  }
};

/**
 * Create a context-aware prompt with summarization
 */
export const buildSmartContextPrompt = async (messages, currentMessage, modelKey = 'deepseek-v3.2') => {
  if (!messages || messages.length === 0) {
    return currentMessage;
  }
  
  const modelLimit = getModelLimit(modelKey);
  const maxContextTokens = Math.floor(modelLimit * 0.6); // Use 60% of limit for context
  
  // Count tokens in current message
  const currentTokens = countTokens(currentMessage);
  const availableForHistory = maxContextTokens - currentTokens - 100; // Reserve for prompt template
  
  if (availableForHistory <= 0) {
    // Current message alone is too long
    return currentMessage;
  }
  
  // Check if we need summarization
  const totalHistoryTokens = messages.reduce((sum, m) => sum + countTokens(m.content || ''), 0);
  
  if (totalHistoryTokens > availableForHistory) {
    // Need to summarize or truncate
    
    // Try to summarize first if conversation is very long
    if (messages.length > 20) {
      const summary = await summarizeConversation(messages, modelKey);
      
      if (summary.summary) {
        return `Previous conversation summary: ${summary.summary}\n\nCurrent message: ${currentMessage}`;
      }
    }
    
    // Fallback: truncate to fit
    let contextMessages = [];
    let tokenCount = 0;
    
    // Take newest messages first
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const msgTokens = countTokens(msg.content || '');
      
      if (tokenCount + msgTokens <= availableForHistory) {
        contextMessages.unshift(msg);
        tokenCount += msgTokens;
      } else {
        // Add a note about truncation
        const truncatedNote = `[Previous ${messages.length - contextMessages.length} messages truncated due to length]`;
        contextMessages.unshift({ role: 'system', content: truncatedNote });
        break;
      }
    }
    
    // Format context
    const contextPrompt = contextMessages.map(m => 
      `${m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Assistant' : 'System'}: ${m.content}`
    ).join('\n');
    
    return `${contextPrompt}\n\nUser: ${currentMessage}\nAssistant:`;
    
  } else {
    // Everything fits, use full history
    const contextPrompt = messages.map(m => 
      `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
    ).join('\n');
    
    return `${contextPrompt}\n\nUser: ${currentMessage}\nAssistant:`;
  }
};