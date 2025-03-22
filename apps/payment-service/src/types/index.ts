/**
 * Type definitions for the payment service
 */
import { Request, Response } from 'express';
import Stripe from 'stripe';

// Express request/response types
export type ExpressRequest = Request;
export type ExpressResponse = Response;

// Customer types
export interface CustomerCredits {
  total: number;
  used: number;
  remaining: number;
}

export interface CustomerData {
  id: string;
  userId: string;
  email: string | null;
  name: string | null;
  createdAt: Date;
  credits: CustomerCredits;
  autoRecharge?: AutoRechargeSettings; // Optional auto-recharge settings
}

// Plan types
export interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  active: boolean;
  metadata: Stripe.Metadata;
}

// Transaction types
export interface TransactionData {
  id: string;
  customerId: string;
  userId: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  timestamp: Date;
}

// API response types
export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  errorCode?: string;
  data?: any;
}

// Auto-recharge types
export interface AutoRechargeSettings {
  enabled: boolean;
  thresholdAmount: number; // Amount at which to trigger recharge
  rechargeAmount: number;  // Amount to add when recharging
} 