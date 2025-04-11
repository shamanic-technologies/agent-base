/**
 * Key Service Server Entry Point
 */
import app from './app.js';
import { PORT, DB_SERVICE_URL, SECRET_SERVICE_URL } from './config.js';
// Start the server
app.listen(PORT, () => {
    console.log('====== KEY SERVICE SERVER START ======');
    console.log(`Key Service running on port ${PORT}`);
    console.log(`Using database service at: ${DB_SERVICE_URL}`);
    console.log(`Using secret service at: ${SECRET_SERVICE_URL}`);
    console.log('=====================================');
});
