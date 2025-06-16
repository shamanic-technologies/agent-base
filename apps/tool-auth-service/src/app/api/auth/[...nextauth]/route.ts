/**
 * NextAuth.js API Route Handler
 * 
 * This file implements the GET and POST handlers for NextAuth
 * using the configuration from options.ts
 */
import NextAuth from "next-auth";
import { authOptions } from "./options";
import type { NextRequest } from "next/server";

const handler = (req: NextRequest, ctx: { params: { nextauth: string[] } }) => {
  // @ts-ignore
  return NextAuth(req, ctx, authOptions(req));
}

export { handler as GET, handler as POST }; 