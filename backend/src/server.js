import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';
import { startKafka, stopKafka } from './config/kafka.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await startKafka();

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    const shutdown = () => {
      server.close(async () => {
        await stopKafka();
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Unable to start server:', error.message);
    await stopKafka();
    process.exit(1);
  }
};

startServer();
