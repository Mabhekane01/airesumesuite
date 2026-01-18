import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const RAW_URI = process.env['MONGODB_URI'] || 'mongodb://localhost:27017/ai-job-suite';
// Sanitize URI: Remove all whitespace, newlines, or carriage returns that might have crept in
const MONGODB_URI = RAW_URI.replace(/\s/g, '');

export const connectDB = async (): Promise<boolean> => {
  try {
    const redactedUri = MONGODB_URI.replace(/:([^@]+)@/, ':****@');
    console.log(`🔌 Attempting to connect to: ${redactedUri}`);
    
    await mongoose.connect(MONGODB_URI, {
      family: 4,
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      connectTimeoutMS: 10000
    });
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.warn('⚠️  MongoDB connection failed. Some features may not work:', error instanceof Error ? error.message : 'Unknown error');
    // Don't exit the process for development, just continue without database
    return false;
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected successfully');
  } catch (error) {
    console.error('❌ MongoDB disconnection error:', error);
  }
};