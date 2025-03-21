/**
 * Plan service for managing subscription plans
 */
import { stripe } from '../config';
import { Plan } from '../types';
import Stripe from 'stripe';

/**
 * Get all active plans
 */
export async function getActivePlans(): Promise<Plan[]> {
  // Fetch products from Stripe
  const products = await stripe.products.list({ active: true, limit: 10 });
    
  // Get prices for each product
  const pricePromises = products.data.map(product => 
    stripe.prices.list({ product: product.id, active: true })
  );
  const priceResults = await Promise.all(pricePromises);
    
  // Combine products with their prices
  return products.data.map((product, idx) => {
    const price = priceResults[idx].data[0]; // Get the first price for simplicity
    return formatPlan(product, price);
  });
}

/**
 * Get a specific plan by ID
 */
export async function getPlanById(planId: string): Promise<Plan | null> {
  try {
    // Get the product details from Stripe
    const product = await stripe.products.retrieve(planId);
    if (!product.active) {
      return null;
    }
    
    // Get prices for this product
    const prices = await stripe.prices.list({ product: product.id, active: true });
    const price = prices.data[0]; // Get the first price for simplicity
    
    return formatPlan(product, price);
  } catch (error) {
    console.error('Error retrieving plan:', error);
    return null;
  }
}

/**
 * Format a Stripe product and price into a Plan object
 */
function formatPlan(product: Stripe.Product, price?: Stripe.Price): Plan {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    price: price ? price.unit_amount! / 100 : 0,
    active: product.active,
    metadata: product.metadata
  };
} 