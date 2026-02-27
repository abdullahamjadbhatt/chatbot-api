import { get_encoding } from 'tiktoken';

// Simple token counter using cl100k_base (works for most modern models)
let encoder = null;

const getEncoder = () => {
  if (!encoder) {
    try {
      encoder = get_encoding('cl100k_base');
    } catch (error) {
      console.warn('TikToken failed to load, using fallback counter');
      return null;
    }
  }
  return encoder;
};

/**
 * Count tokens in a string (approximate)
 * Falls back to character count/4 if tiktoken unavailable
 */
export const countTokens = (text) => {
  if (!text) return 0;
  
  const enc = getEncoder();
  if (enc) {
    return enc.encode(text).length;
  }
  
  // Fallback: rough estimate (4 chars ≈ 1 token for English)
  return Math.ceil(text.length / 4);
};

/**
 * Count tokens in an array of messages
 */
export const countMessagesTokens = (messages) => {
  let total = 0;
  for (const msg of messages) {
    total += countTokens(msg.content || '');
    // Add overhead for role formatting
    total += 4; // Approximate overhead per message
  }
  return total;
};

/**
 * Truncate messages to fit within token limit
 */
export const truncateMessages = (messages, maxTokens = 4000) => {
  const result = [];
  let totalTokens = 0;
  
  // Start from newest messages (reverse)
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const msgTokens = countTokens(msg.content || '') + 4;
    
    if (totalTokens + msgTokens <= maxTokens) {
      result.unshift(msg); // Add to front to maintain order
      totalTokens += msgTokens;
    } else {
      break;
    }
  }
  
  return {
    messages: result,
    totalTokens,
    truncated: result.length < messages.length
  };
};

/**
 * Get model-specific token limits
 */
export const MODEL_TOKEN_LIMITS = {
  'deepseek-v3.2': 8000,
  'zai-org/GLM-5': 4096,
  'mimo-v2-flash': 32000
};

export const getModelLimit = (modelKey) => {
  return MODEL_TOKEN_LIMITS[modelKey] || 4000; // Default to 4k
};