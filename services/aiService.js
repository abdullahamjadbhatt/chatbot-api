import dotenv from 'dotenv';
dotenv.config();

import { InferenceClient } from '@huggingface/inference';

import "colors";

// Initialize Hugging Face client
const client = new InferenceClient(process.env.HUGGINGFACE_API_KEY);

// Choose your model - you can swap this anytime!
const DEFAULT_MODEL = "deepseek-ai/DeepSeek-V3.2:cheapest";

/**
 * Send a message to Hugging Face and get response
 * @param {string} message - User message
 * @param {string} modelKey - Optional: model key from AVAILABLE_MODELS
 * @returns {Promise<string>} - AI response
 */
export const generateResponse = async (message, modelKey = "deepseek-v3.2") => {
  try {
    // Get the full model ID from the key
    const modelId = AVAILABLE_MODELS[modelKey] || DEFAULT_MODEL;
    
    console.log(`Sending to Hugging Face (${modelId}): "${message.substring(0, 50)}..."`.blue);
    
    // Using chat completion endpoint (works with instruct models)
    const response = await client.chatCompletion({
      model: modelId,
      messages: [
        { role: "system", content: "You are a helpful, friendly AI assistant." },
        { role: "user", content: message }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });
    
    const reply = response.choices[0].message.content;
    console.log(`Received response: "${reply.substring(0, 50)}..."`.green);
    return reply;
    
  } catch (error) {
    console.error("Hugging Face API Error:", error.message.red);
    
    // Provide more specific error messages
    if (error.message.includes("403")) {
      throw new Error("API key invalid or unauthorized. Check your token at huggingface.co/settings/tokens");
    } else if (error.message.includes("429")) {
      throw new Error("Rate limit exceeded. Free tier allows ~30 requests/minute");
    } else if (error.message.includes("503")) {
      throw new Error("Model is loading. Try again in a few seconds");
    }
    
    throw new Error("Failed to generate AI response: " + error.message);
  }
};

/**
 * List of recommended free models you can use
 */
export const AVAILABLE_MODELS = {
  "deepseek-v3.2": "deepseek-ai/DeepSeek-V3.2:cheapest",
  "zai-org/GLM-5": "zai-org/GLM-5:cheapest",
  "zephyr-7b": "HuggingFaceH4/zephyr-7b-beta:cheapest",
  "mimo-v2-flash": "XiaomiMiMo/MiMo-V2-Flash:cheapest"
};

/**
 * Get model display name and description
 */
export const getModelInfo = (modelKey) => {
  const descriptions = {
    "deepseek-v3.2": "DeepSeek-V3.2 - Efficient Reasoning & Agentic AI",
    "zai-org/GLM-5": "zai.org / GLM-5 - For complex systems engineering and long-horizon agentic tasks",
    "zephyr-7b": "Zephyr is a series of language models that are trained to act as helpful assistants",
    "mimo-v2-flash": "Xiaomi MiMo-V2-Flash"
  };
  
  return {
    key: modelKey,
    modelId: AVAILABLE_MODELS[modelKey],
    description: descriptions[modelKey] || 'Hugging Face model',
    displayName: modelKey.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  };
};