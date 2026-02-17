import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import chatRoutes from './routes/chatRoutes.js';
import { AVAILABLE_MODELS } from './services/aiService.js';
import "colors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint - enhanced for Hugging Face
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Hugging Face Inference API',
    default_model: 'deepseek-ai/DeepSeek-V3.2:cheapest',
    available_models: Object.keys(AVAILABLE_MODELS),
    documentation: {
      chat_endpoint: 'POST /api/chat',
      expected_body: { 
        message: 'string (required)', 
        model: 'string (optional) - one of: ' + Object.keys(AVAILABLE_MODELS).join(', ')
      }
    }
  });
});

// Routes
app.use('/api', chatRoutes);

// 404 handler
app.use('/*splat', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    available_endpoints: [
      'GET /health',
      'POST /api/chat',
      'GET /api/models',
      'POST /api/chat/stream'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack.red);
  res.status(500).json({ 
    error: 'Something went wrong',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log('=================================='.blue);
  console.log('Hugging Face Chat API'.blue);
  console.log(`Server: http://localhost:${PORT}`.blue);
  console.log(`Health: http://localhost:${PORT}/health`.blue);
  console.log(`Chat:   POST http://localhost:${PORT}/api/chat`.blue);
  console.log(`Models: GET http://localhost:${PORT}/api/models`.blue);
  console.log('Models available:', Object.keys(AVAILABLE_MODELS).join(', ').blue);
  console.log('=================================='.blue);
});