import mongoose from 'mongoose';

// Message schema - embedded approach
const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  model: {
    type: String,
    default: 'deepseek-v3.2'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  tokens: {
    type: Number, // Optional: track token usage
    default: 0
  }
});

// Main conversation schema
const conversationSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true //Index for fast lookups
  },
  userId: {
    type: String,
    default: 'anonymous'
  },
  messages: [messageSchema], // Embed messages array
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    totalTokens: Number
  }
});

// Update the updatedAt timestamp before saving
conversationSchema.pre('save', async function() {
    this.updatedAt = Date.now();
    // next();
});

// Create indexes for common queries
conversationSchema.index({ sessionId: 1, updatedAt: -1 });
conversationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // Optional: auto-delete after 30 days

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;