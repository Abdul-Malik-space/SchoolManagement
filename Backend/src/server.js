require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

let server;

const startServer = async () => {
  try {
    // Server شروع ہونے سے پہلے connection مکمل کریں
    await connectDB();

    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(
      `Server Startup Error: ${error.message}`
    );

    process.exit(1);
  }
};

startServer();

process.on(
  "unhandledRejection",
  (error) => {
    console.error(
      `Unhandled Rejection: ${error.message}`
    );

    if (server) {
      server.close(() => {
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  }
);

process.on(
  "uncaughtException",
  (error) => {
    console.error(
      `Uncaught Exception: ${error.message}`
    );

    process.exit(1);
  }
);