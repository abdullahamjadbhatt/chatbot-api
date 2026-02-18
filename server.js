import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import chatRoutes from './routes/chatRoutes.js';
import { AVAILABLE_MODELS } from './services/aiService.js';
import { connectDB } from './config/database.js';
import mongoose from 'mongoose';
import 'colors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
await connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Hugging Face Chat API',
    database: 'MongoDB Connected',
    default_model: 'deepseek-ai/DeepSeek-V3.2:cheapest',
    available_models: Object.keys(AVAILABLE_MODELS),
    documentation: {
      chat_endpoint: 'POST /api/chat',
      history_endpoint: 'GET /api/chat/history/:sessionId',
      delete_endpoint: 'DELETE /api/chat/history/:sessionId'
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
      'POST /api/chat/stream',
      'GET /api/chat/history/:sessionId',
      'DELETE /api/chat/history/:sessionId'
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
  console.log(`History:GET http://localhost:${PORT}/api/chat/history/:sessionId`.blue);
  console.log(`Models: GET http://localhost:${PORT}/api/models`.blue);
  console.log('Models available:', Object.keys(AVAILABLE_MODELS).join(', ').blue);
  console.log('=================================='.blue);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...'.blue);
  await mongoose.disconnect();
  process.exit(0);
});