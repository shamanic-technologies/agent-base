import { Router, Request, Response, NextFunction } from "express";
import { callLangGraphService } from "@agent-base/api-client";
import { AgentBaseCredentials } from "@agent-base/types";

const router = Router();

router.post(
  "/langgraph", // Path simplified as requested
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Inputs aligned with the pattern in run-langgraph.ts
      const { conversationId, messages } = req.body;

      // --- Extract Credentials ---
      const clientUserId = req.clientUserId as string;
      const clientOrganizationId = req.clientOrganizationId as string;
      const platformApiKey = req.headers["x-platform-api-key"] as string;

      if (!clientUserId || !clientOrganizationId || !platformApiKey || !conversationId || !messages) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }

      // --- Prepare Credentials ---
      const agentBaseCredentials: AgentBaseCredentials = {
        clientAuthUserId: clientUserId,
        clientAuthOrganizationId: clientOrganizationId,
        platformApiKey: platformApiKey,
      };

      // --- Call the LangGraph Service SDK ---
      const langGraphResponse = await callLangGraphService(
        conversationId,
        agentBaseCredentials
      );

      // --- Stream the response directly to the client ---
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      if (!langGraphResponse.body) {
        throw new Error("The response from the LangGraph service is empty.");
      }

      // Use pipeTo for a clean, efficient, and high-level stream transfer.
      await langGraphResponse.body.pipeTo(new WritableStream({
        write(chunk) {
          res.write(chunk);
        }
      }));

      res.end();

    } catch (error) {
      next(error);
    }
  },
);

export default router;
