export interface GetAgentIdForWebhookRequest {
  webhookProviderId: string;
  clientUserId: string;
}

export interface GetUserIdsByWebsiteIdRequest {
  webhookProviderId: string;
  websiteId: string;
}
