/**
 * Controller for plan-related endpoints
 */
import { ExpressRequest, ExpressResponse } from '../types';
import * as planService from '../services/planService';

/**
 * Get all available plans
 */
export async function getPlans(req: ExpressRequest, res: ExpressResponse) {
  try {
    const plans = await planService.getActivePlans();
    
    return res.status(200).json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Error retrieving plans:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve plans'
    });
  }
}

/**
 * Get a specific plan by ID
 */
export async function getPlanById(req: ExpressRequest, res: ExpressResponse) {
  try {
    const { id } = req.params;
    
    const plan = await planService.getPlanById(id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found or inactive'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('Error retrieving plan:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve plan'
    });
  }
} 