// import mongoose from "mongoose";

// const connectDB = async () => {
//   try {

//     const conn = await mongoose.connect(process.env.MONGO_URI);

//     console.log(`MongoDB Connected: ${conn.connection.host}`);

//   } catch (error) {

//     console.error("Database connection failed:", error.message);
//     process.exit(1);

//   }
// };

// export default connectDB;
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in .env file');
    }

    console.log('🔄 Connecting to MongoDB...');
    console.log('📌 Using standard connection string');
    
    // Simple connection with IPv4 preference
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name || 'default'}`);
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
};

export default connectDB;