import Stripe from "stripe";
import { ToolCall } from "ai";


export type CreditConsumption = {
  items: CreditConsumptionItem[];
  totalAmountInUSDCents: number;
};

export interface CreditConsumptionItem {
  totalAmountInUSDCents: number;
  consumptionType: CreditConsumptionType;
  consumptionUnits: number;
}

export enum CreditConsumptionType {
  TOOL_CALL = "TOOL_CALL",
  INPUT_TOKEN = "INPUT_TOKEN",
  OUTPUT_TOKEN = "OUTPUT_TOKEN",
}

export enum Pricing {
  FREE_SIGNUP_CREDIT_AMOUNT_IN_USD_CENTS = 500,
  TOOL_CALL_PRICE_IN_USD_CENTS = 1,
  MILLION_INPUT_TOKENS_PRICE_IN_USD_CENTS = 600,
  MILLION_OUTPUT_TOKENS_PRICE_IN_USD_CENTS = 3000,
  AUTO_RECHARGE_THRESHOLD_IN_USDCENTS = 5000,
  AUTO_RECHARGE_RECHARGE_AMOUNT_IN_USDCENTS = 10000,
}


// Customer types
export interface CustomerCredits {
  totalInUSDCents: number;
  usedInUSDCents: number;
  remainingInUSDCents: number;
}

export interface StripeCustomerInformation {
  stripeCustomerId: string;
  stripePlatformUserId: string;
  stripeEmail: string | null;
  stripeName: string | null;
  stripeCreatedAt: Date;
  stripeCredits: CustomerCredits;
  autoRechargeSettings?: AutoRechargeSettings; // Optional auto-recharge settings
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
export interface StripeTransaction {
  id: string;
  stripeCustomerId: string;
  platformUserId: string;
  type: 'credit' | 'debit';
  amountInUSDCents: number;
  description: string;
  timestamp: Date;
}

// Auto-recharge types
export interface AutoRechargeSettings {
  enabled: boolean;
  thresholdAmountInUSDCents: number;
  rechargeAmountInUSDCents: number;
} 

export interface CreateCheckoutSessionRequest {
  amountInUSDCents: number;
  successUrl: string;
  cancelUrl: string;
}

export interface ValidateCreditRequest {
  amountInUSDCents: number;
}

export interface ValidateCreditResponse {
  hasEnoughCredit: boolean;
  remainingCreditInUSDCents: number;
}

export interface DeductCreditRequest {
  toolCalls: ToolCall<string, string>[];
  inputTokens: number;
  outputTokens: number;
}

export interface DeductCreditResponse {
  creditConsumption: CreditConsumption;
  newBalanceInUSDCents: number;
}

export interface createCustomerRequest {
  platformUserEmail?: string;
  platformUserName?: string;
}



