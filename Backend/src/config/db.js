const mongoose = require("mongoose");

let connectionPromise = null;

const connectDB = async () => {
  // Connection پہلے ہی تیار ہے
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!process.env.MONGO_URI) {
    throw new Error(
      "MONGO_URI is missing from environment variables."
    );
  }

  // ایک ہی وقت میں متعدد connections بننے سے روکیں
  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 15000,
        maxPoolSize: 10,
      })
      .then((mongooseInstance) => {
        console.log(
          `MongoDB Connected: ${mongooseInstance.connection.host}`
        );

        return mongooseInstance.connection;
      })
      .catch((error) => {
        connectionPromise = null;

        console.error(
          `MongoDB Connection Error: ${error.message}`
        );

        throw error;
      });
  }

  return connectionPromise;
};

module.exports = connectDB;