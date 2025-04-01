/**
 * NextAuth.js API Route Handler
 * 
 * This file implements the GET and POST handlers for NextAuth
 * using the configuration from options.ts
 */
import NextAuth from "next-auth";
import { authOptions } from "./options";

// Create the NextAuth handler with our options
const handler = NextAuth(authOptions);

// Export the handler for the GET and POST methods
export { handler as GET, handler as POST }; 