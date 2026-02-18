import mongoose from 'mongoose';
import dotenv from 'dotenv';
import "colors";

dotenv.config();

let isConnected = false; // Track connection status

export const connectDB = async () => {
  if (isConnected) {
    console.log('Using existing MongoDB connection'.blue);
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGODB_URI, {
      // These options are no longer needed in Mongoose 6+, but kept for clarity
      autoIndex: true, // Build indexes
    });

    isConnected = !!db.connections[0].readyState;
    console.log('MongoDB connected successfully'.green);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err.red);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected'.red);
      isConnected = false;
    });

  } catch (error) {
    console.error('MongoDB connection failed:', error.message.red);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  if (!isConnected) return;
  
  await mongoose.disconnect();
  isConnected = false;
  console.log('MongoDB disconnected'.blue);
};