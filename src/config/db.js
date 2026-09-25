import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not configured');
  }

  console.log('MongoDB URI check:', {
    exists: Boolean(uri),
    startsWithMongoSrv: uri.startsWith('mongodb+srv://'),
    containsAtlasHost: uri.includes('mongodb.net'),
    length: uri.length,
  });

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 30000,
    maxPoolSize: 10,
  });

  console.log('MongoDB connected');
}