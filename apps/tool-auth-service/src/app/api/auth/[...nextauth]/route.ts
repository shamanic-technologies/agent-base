/**
 * NextAuth.js API Route Handler
 * 
 * This file implements the GET and POST handlers for NextAuth
 * using the configuration from options.ts
 */
import NextAuth from "next-auth";
import { authOptions } from "./options";
import { NextApiRequest, NextApiResponse } from "next";

async function handler(req: NextApiRequest, res: NextApiResponse) {
    return NextAuth(req, res, authOptions(req, res));
}

export { handler as GET, handler as POST }; 