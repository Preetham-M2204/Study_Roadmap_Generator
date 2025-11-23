/**
 * db.js - MongoDB Connection Configuration
 * 
 * This file handles connecting to MongoDB Atlas (cloud database).
 * 
 * Why we need this:
 * - Centralize database connection logic
 * - Reuse connection across all routes
 * - Handle connection errors gracefully
 */

const mongoose = require('mongoose');

/**
 * Connect to MongoDB Atlas
 * 
 * What happens here:
 * 1. Read MONGODB_URI from environment variables (.env file)
 * 2. Use mongoose to establish connection
 * 3. Log success or error messages
 */
const connectDB = async () => {
  try {
    // mongoose.connect() opens connection to MongoDB
    // process.env.MONGODB_URI reads from .env file
    // Note: useNewUrlParser and useUnifiedTopology are no longer needed in Mongoose 6+
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    // conn.connection.host = your cluster URL (cluster0.oiiddf3.mongodb.net)
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database Name: ${conn.connection.name}`);
  } catch (error) {
    // If connection fails, log error and exit process
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1); // Exit with failure code
  }
};

// Export so we can use in server.js
module.exports = connectDB;
