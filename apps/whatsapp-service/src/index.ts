import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import twilio from "twilio";
import { Readable } from "stream";
import {
  getOrCreateAgents,
  getOrCreateConversationsPlatformUserApiService,
  triggerLangGraphAgentRunStream,
} from "@agent-base/api-client";
import { AgentBaseCredentials, ServiceResponse, Agent, Conversation } from "@agent-base/types";
import { HumanMessage } from "@langchain/core/messages";

// Validate environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const agentBaseApiKey = process.env.AGENT_BASE_API_KEY;
const clientAuthOrganizationId = process.env.CLIENT_AUTH_ORGANIZATION_ID;


if (!accountSid || !authToken || !agentBaseApiKey || !clientAuthOrganizationId) {
  throw new Error(
    "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, AGENT_BASE_API_KEY, and CLIENT_AUTH_ORGANIZATION_ID must be set in the environment variables."
  );
}

const twilioClient = twilio(accountSid, authToken);
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

interface TwilioRequestBody {
  Body: string;
  From: string; // e.g., 'whatsapp:+14155238886'
  To: string; // e.g., 'whatsapp:+15005550006'
}

/**
 * Handles incoming WhatsApp messages from Twilio.
 * It forwards the message to the agent-service via the api-client SDK and streams the response back to the user.
 */
app.post(
  "/whatsapp",
  async (
    req: Request<{}, {}, TwilioRequestBody>,
    res: Response
  ) => {
    const { Body: userMessage, From: userPhoneNumber, To: twilioPhoneNumber } = req.body;

    console.log(
      `Received message from ${userPhoneNumber}: "${userMessage}"`
    );

    // Immediately send a 200 OK response to Twilio to acknowledge receipt of the message
    const { MessagingResponse } = twilio.twiml;
    const twilioResponse = new MessagingResponse();
    res.type("text/xml").send(twilioResponse.toString());

    // Construct credentials for the SDK call
    const credentials: AgentBaseCredentials = {
      clientAuthUserId: userPhoneNumber, // Use the sender's WA number as the client user ID
      clientAuthOrganizationId,
      platformApiKey: agentBaseApiKey,
    };

    try {
      // 1. Get or create agent
      const agentResponse: ServiceResponse<Agent[]> = await getOrCreateAgents(credentials);
      if (!agentResponse.success || !agentResponse.data || agentResponse.data.length === 0) {
        throw new Error("Failed to get or create agent.");
      }
      // The response is an array of agents, so we take the first one.
      const agent = agentResponse.data[0];

      if (!agent || !agent.id) {
        throw new Error("Agent ID is missing in the response.");
      }
      
      // 2. Get or create conversation
      const convosResponse: ServiceResponse<Conversation[]> =
        await getOrCreateConversationsPlatformUserApiService(
          { agentId: agent.id },
          credentials,
        );
      if (!convosResponse.success || convosResponse.data.length === 0) {
        throw new Error("Failed to get or create conversations.");
      }
      const conversationId = convosResponse.data[0].conversationId;

      // 3. Construct the message payload for LangChain
      const messages = [new HumanMessage({ content: userMessage })];

      // 4. Trigger the agent run with the correct conversationId
      const response = await triggerLangGraphAgentRunStream(
        conversationId,
        messages,
        credentials,
      );

      // Convert the web stream to a Node.js Readable stream
      const stream = Readable.fromWeb(response.body as any);

      let buffer = "";
      let messageBuffer = ""; // Buffer to accumulate message content

      stream.on("data", async (chunk: Buffer) => {
        buffer += chunk.toString();
        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const eventString = buffer.substring(0, boundary);
          buffer = buffer.substring(boundary + 2);
          if (eventString.startsWith("data:")) {
            const data = JSON.parse(eventString.substring(5));

            switch (data.event) {
              case "on_chat_model_stream": {
                const contentParts = data.data?.chunk?.kwargs?.content;
                if (Array.isArray(contentParts)) {
                  for (const part of contentParts) {
                    if (part.type === "text" && part.text) {
                      messageBuffer += part.text;
                    }
                  }
                }
                break;
              }
              case "on_tool_start": {
                if (messageBuffer) {
                  await twilioClient.messages.create({
                    body: messageBuffer,
                    from: twilioPhoneNumber,
                    to: userPhoneNumber,
                  });
                  messageBuffer = ""; // Clear the buffer after sending
                }
                await twilioClient.messages.create({
                  body: "Just a moment, I'm working on your request...",
                  from: twilioPhoneNumber,
                  to: userPhoneNumber,
                });
                break;
              }
            }
          }
          boundary = buffer.indexOf("\n\n");
        }
      });

      stream.on("end", async () => {
        if (messageBuffer) {
          await twilioClient.messages.create({
            body: messageBuffer,
            from: twilioPhoneNumber,
            to: userPhoneNumber,
          });
        }
        console.log("Stream ended.");
      });

      stream.on("error", (error) => {
        console.error("Stream error:", error);
      });
    } catch (error) {
      console.error("Error calling agent-service via SDK:", error);
      // Optionally, send an error message to the user
      twilioClient.messages.create({
        body: "Sorry, I encountered an error. Please try again later.",
        from: twilioPhoneNumber,
        to: userPhoneNumber,
      });
    }
  }
);

/**
 * Starts the Express server.
 */
const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3100;
    if (isNaN(port)) {
      throw new Error("Invalid port number provided in environment variables.");
    }
    app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start(); 