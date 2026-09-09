import mongoose from 'mongoose';
import dns from 'node:dns';

// The local Windows DNS resolver refuses Atlas SRV lookups on some networks.
// Vercel must use its own platform DNS resolver.
if (process.env.NODE_ENV !== 'production') {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
}

let connectionPromise;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    throw new Error('MONGODB_URI is not configured');
  }

  if (!connectionPromise) {
    console.log('🔄 Connecting to MongoDB...');

    connectionPromise = mongoose
      .connect(mongoURI, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      })
      .then((conn) => {
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📊 Database: ${conn.connection.name || 'default'}`);
        return conn.connection;
      })
      .catch((error) => {
        connectionPromise = undefined;
        console.error('❌ Connection failed:', error.message);
        throw error;
      });
  }

  return connectionPromise;
};

export default connectDB;
