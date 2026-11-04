import mongoose from 'mongoose';
import { env } from './env.js';

let isConnected = false;

export async function connectDB(): Promise<typeof mongoose> {
  if (isConnected) {
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    isConnected = true;
    console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error: any) {
    console.error('❌ MongoDB connection error:');
    console.error('   Please verify that MONGODB_URI is correctly set in Render Environment Variables,');
    console.error('   and that your MongoDB Atlas Network Access allows 0.0.0.0/0 (anywhere).');
    console.error('   Error details:', error?.message || error);
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
  }
}

