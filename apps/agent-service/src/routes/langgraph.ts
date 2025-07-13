import { Router, Request, Response } from "express";
import { PassThrough } from "stream";

const router = Router();

/**
 * Handles a run request using the LangGraph engine.
 * This endpoint is designed to be a generic streaming endpoint for any client.
 */
router.post(
  "/run/langgraph",
  async (
    req: Request<{}, {}, { message: string; from: string }>,
    res: Response
  ) => {
    const { message, from } = req.body;
    console.log(
      `Received message for LangGraph run from ${from}: "${message}"`
    );

    // TODO: Replace this with the actual LangGraph implementation.
    const stream = new PassThrough();
    stream.write("Hello World from agent-service via LangGraph route!");
    stream.end();

    res.type("text/plain");
    stream.pipe(res);
  }
);

export default router; 