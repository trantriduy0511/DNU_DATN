import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dnu-social';
    console.log(`🔄 Attempting to connect to MongoDB...`);
    
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000, // Timeout after 10s
      socketTimeoutMS: 45000,
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    return true;
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    console.error(`💡 Please make sure MongoDB is running`);
    console.error(`💡 Windows: net start MongoDB (as Administrator)`);
    console.error(`💡 Or start MongoDB manually`);
    // Return false instead of exiting
    return false;
  }
};

export default connectDB;


