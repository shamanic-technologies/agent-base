import Stripe from "stripe";
import { ToolCall } from "ai";


export type AgentBaseCreditConsumption = {
  items: AgentBaseCreditConsumptionItem[];
  totalAmountInUSDCents: number;
};

export interface AgentBaseCreditConsumptionItem {
  totalAmountInUSDCents: number;
  consumptionType: AgentBaseCreditConsumptionType;
  consumptionUnits: number;
}

export enum AgentBaseCreditConsumptionType {
  TOOL_CALL = "TOOL_CALL",
  INPUT_TOKEN = "INPUT_TOKEN",
  OUTPUT_TOKEN = "OUTPUT_TOKEN",
}

export enum AgentBasePricing {
  AGENT_BASE_FREE_SIGNUP_CREDIT_AMOUNT_IN_USD_CENTS = 200,
  AGENT_BASE_TOOL_CALL_PRICE_IN_USD_CENTS = 1,
  AGENT_BASE_MILLION_INPUT_TOKENS_PRICE_IN_USD_CENTS = 600,
  AGENT_BASE_MILLION_OUTPUT_TOKENS_PRICE_IN_USD_CENTS = 3000,
}

// Customer types
export interface AgentBaseCustomerCredits {
  totalInUSDCents: number;
  usedInUSDCents: number;
  remainingInUSDCents: number;
}

export interface AgentBaseStripeCustomerInformation {
  stripeCustomerId: string;
  stripePlatformUserId: string;
  stripeEmail: string | null;
  stripeName: string | null;
  stripeCreatedAt: Date;
  stripeCredits: AgentBaseCustomerCredits;
  autoRechargeSettings?: AgentBaseAutoRechargeSettings; // Optional auto-recharge settings
}

// Plan types
// export interface StripePlan {
//   id: string;
//   name: string;
//   description: string | null;
//   priceInUSDCents: number;
//   active: boolean;
//   metadata: Stripe.Metadata;
// }

// Transaction types
export interface AgentBaseStripeTransaction {
  id: string;
  stripeCustomerId: string;
  platformUserId: string;
  type: 'credit' | 'debit';
  amountInUSDCents: number;
  description: string;
  timestamp: Date;
}

// Auto-recharge types
export interface AgentBaseAutoRechargeSettings {
  enabled: boolean;
  thresholdAmountInUSDCents?: number;
  rechargeAmountInUSDCents?: number;
}

export enum AgentBaseDefaultAutoRechargeSettings {
  AGENT_BASE_DEFAULT_AUTO_RECHARGE_THRESHOLD_AMOUNT_IN_USD_CENTS = 5000,
  AGENT_BASE_DEFAULT_AUTO_RECHARGE_RECHARGE_AMOUNT_IN_USD_CENTS = 10000,
}

export interface AgentBaseCreateCheckoutSessionRequest {
  amountInUSDCents: number;
  successUrl: string;
  cancelUrl: string;
}

export interface AgentBaseValidateCreditRequest {
  amountInUSDCents: number;
}

export interface AgentBaseValidateCreditResponse {
  hasEnoughCredit: boolean;
  remainingCreditInUSDCents: number;
}

export interface AgentBaseDeductCreditRequest {
  toolCalls: ToolCall<string, string>[];
  inputTokens: number;
  outputTokens: number;
}

export interface AgentBaseDeductCreditResponse {
  creditConsumption: AgentBaseCreditConsumption;
  newBalanceInUSDCents: number;
}

export interface AgentBaseCreateCustomerRequest {
  platformUserEmail?: string;
  platformUserName?: string;
}

export interface AgentBaseConsumeCreditsRequest {
  totalAmountInUSDCents: number;
  conversationId?: string;
}

export interface AgentBaseConsumeCreditsResponse {
  remainingBalanceInUSDCents: number;
  transactionId?: string;
}

export interface AgentBaseCreditStreamPayloadData {
  creditConsumption?: AgentBaseCreditConsumption;
  newBalanceInUSDCents?: number;
  assistantMessageId: string;
}

export interface AgentBaseCreditStreamPayload {
  type: 'credit_info';
  success: boolean;
  data?: AgentBaseCreditStreamPayloadData;
  error?: string;
  details?: string;
}


