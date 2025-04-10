"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Key Service Server Entry Point
 */
const app_js_1 = __importDefault(require("./app.js"));
const config_js_1 = require("./config.js");
// Start the server
app_js_1.default.listen(config_js_1.PORT, () => {
    console.log('====== KEY SERVICE SERVER START ======');
    console.log(`Key Service running on port ${config_js_1.PORT}`);
    console.log(`Using database service at: ${config_js_1.DB_SERVICE_URL}`);
    console.log(`Using secret service at: ${config_js_1.SECRET_SERVICE_URL}`);
    console.log('=====================================');
});
