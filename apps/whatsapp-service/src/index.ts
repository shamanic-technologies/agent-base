import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import twilio from "twilio";
import { Readable } from "stream";
import { triggerLangGraphAgentRunStream } from "@agent-base/api-client";
import { AgentBaseCredentials } from "@agent-base/types";

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
        platformApiKey: agentBaseApiKey
    };

    try {
      const response = await triggerLangGraphAgentRunStream(
        userMessage,
        userPhoneNumber,
        credentials
      );

      // Convert the web stream to a Node.js Readable stream
      const stream = Readable.fromWeb(response.body as any);

      stream.on("data", (chunk: Buffer) => {
        try {
          const message = chunk.toString();
          console.log(`Streaming message to ${userPhoneNumber}: "${message}"`);
          twilioClient.messages.create({
            body: message,
            from: twilioPhoneNumber,
            to: userPhoneNumber,
          });
        } catch (error) {
            console.error("Error processing stream chunk:", error);
        }
      });

      stream.on("end", () => {
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