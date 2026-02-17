import dotenv from 'dotenv';
import { generateResponse, AVAILABLE_MODELS, getModelInfo } from './services/aiService.js';
import "colors";

dotenv.config();

async function test() {
  console.log("Testing Hugging Face API connection...".blue);
  console.log("Available models:", Object.keys(AVAILABLE_MODELS));
  
  // Test each model
  for (const [key, modelInfo] of Object.entries(AVAILABLE_MODELS)) {
    console.log(`\nTesting ${key} (${modelInfo})...`.blue);
    
    try {
      const response = await generateResponse("Say hello in one word", key);
      console.log(`${key} success! Response:`, response.green);
    } catch (error) {
      console.log(`${key} failed:`, error.message.red);
    }
    
    // Small delay between requests to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log("\n Model Details:".blue);
  Object.keys(AVAILABLE_MODELS).forEach(key => {
    const info = getModelInfo(key);
    console.log(`- ${info.displayName}: ${info.description}`.blue);
  });
}

test().catch(console.error);