// // Load environment variables FIRST (Now handled by tsx --env-file flag)
// import dotenv from 'dotenv';
// import path from 'path';
// import fs from 'fs';
// const NODE_ENV = process.env.NODE_ENV || 'development';
// // Only load from .env file in development
// if (NODE_ENV === 'development') {
//   const envFile = path.resolve(process.cwd(), '.env.local');
//   if (fs.existsSync(envFile)) {
//     console.log(`Loading environment from ${envFile} (handled by tsx)`);
//     dotenv.config({ path: envFile }); // tsx should already do this
//   } else {
//     console.log(`Environment file ${envFile} not found, using default environment variables.`);
//   }
// } else {
//   console.log('Production environment detected, using Railway configuration.');
// }
/**
 * HelloWorld Database Service
 *
 * A PostgreSQL-based database service for storing and retrieving data.
 * Acts as a data persistence layer for the other services.
 * Uses Railway PostgreSQL for data storage.
 */
import express from 'express';
import cors from 'cors';
// Removed redundant dotenv, path, fs imports from here
import routes from './routes/index.js';
import { testConnection } from './db.js'; // db.js will now see env vars loaded by tsx
// Removed the env loading logic from here as it's now at the top
async function startServer() {
    // console.log(`Loading environment variables... (Handled by tsx)`); // Optional: Adjust log message
    // Test database connection before starting the server
    const dbConnected = await testConnection();
    if (!dbConnected) {
        console.error('Failed to connect to database, exiting...');
        process.exit(1);
    }
    // Initialize Express app
    const app = express();
    const PORT = process.env.PORT || 3006;
    // Middleware
    app.use(cors());
    app.use(express.json());
    // Simple request logger
    app.use((req, res, next) => {
        console.log(`[DB Service] ${req.method} ${req.path}`);
        next();
    });
    // Configure routes - Assuming 'routes' is imported from './routes/index.js'
    app.use(routes);
    // Start server
    app.listen(PORT, () => {
        // Updated final log message
        console.log(`💾 Database Service running on port ${PORT}. Connection to DB via DATABASE_URL successful.`);
    });
}
startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
