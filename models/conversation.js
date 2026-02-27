import mongoose from 'mongoose';
import {countTokens} from "../services/tokenCounter.js";

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
    type: Number,
    default: function() {
      // Auto-count tokens when message is created
      return countTokens(this.content);
    }
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
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
    default: 'anonymous',
    index: true
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
  summary: {
    text: String,
    lastUpdated: Date,
    tokenCount: Number
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    totalTokens: {
      type: Number,
      default: 0
    }
  }
});

// Update the updatedAt timestamp before saving
conversationSchema.pre('save', async function() {
  this.updatedAt = Date.now();
  // next();
  
  // Update total tokens
  if (this.messages && this.messages.length > 0) {
    this.metadata.totalTokens = this.messages.reduce(
      (sum, msg) => sum + (msg.tokens || 0), 
      0
    );
  }
});

// Create indexes for common queries
conversationSchema.index({ sessionId: 1, updatedAt: -1 });
conversationSchema.index({ userId: 1, updatedAt: -1 });
conversationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // Optional: auto-delete after 30 days
conversationSchema.index({ 'metadata.totalTokens': 1 }); // For analytics

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;