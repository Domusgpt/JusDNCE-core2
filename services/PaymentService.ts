/**
 * PaymentService.ts
 * 
 * Handles payment processing and subscription management
 * Integrates with Stripe for secure payment processing
 * 
 * A Paul Phillips Manifestation
 * "The Revolution Will Not be in a Structured Format"
 */

// Types
export interface PaymentPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval?: 'month' | 'year' | null; // null for one-time payments
  features: string[];
  exportsIncluded: number | 'unlimited';
  stripePriceId: string;
}

export interface PaymentSession {
  id: string;
  url: string;
  status: 'pending' | 'complete' | 'expired';
}

export interface SubscriptionStatus {
  isActive: boolean;
  plan?: PaymentPlan;
  exportsRemaining: number;
  renewsAt?: Date;
  customerId?: string;
}

// Payment Plans Configuration
export const PAYMENT_PLANS: { [key: string]: PaymentPlan } = {
  SINGLE_EXPORT: {
    id: 'single_export',
    name: 'Single Full Export',
    price: 4.99,
    currency: 'USD',
    interval: null,
    features: [
      'One full-length song export',
      'HD 1080p quality',
      'All effects included',
      'No watermark'
    ],
    exportsIncluded: 1,
    stripePriceId: 'price_single_export' // Replace with actual Stripe price ID
  },
  
  BASIC_MONTHLY: {
    id: 'basic_monthly',
    name: 'Basic Plan',
    price: 9.99,
    currency: 'USD',
    interval: 'month',
    features: [
      '10 full-length exports per month',
      'HD 1080p quality',
      'All effects included',
      'Priority processing',
      'Email support'
    ],
    exportsIncluded: 10,
    stripePriceId: 'price_basic_monthly' // Replace with actual Stripe price ID
  },
  
  PRO_MONTHLY: {
    id: 'pro_monthly',
    name: 'Pro Plan',
    price: 24.99,
    currency: 'USD',
    interval: 'month',
    features: [
      '50 full-length exports per month',
      '4K quality available',
      'Batch processing',
      'Advanced effects',
      'Priority queue',
      'Direct support'
    ],
    exportsIncluded: 50,
    stripePriceId: 'price_pro_monthly' // Replace with actual Stripe price ID
  },
  
  STUDIO_MONTHLY: {
    id: 'studio_monthly',
    name: 'Studio Plan',
    price: 99.99,
    currency: 'USD',
    interval: 'month',
    features: [
      'Unlimited exports',
      '4K quality',
      'API access',
      'Custom integrations',
      'Dedicated support',
      'White-label options'
    ],
    exportsIncluded: 'unlimited',
    stripePriceId: 'price_studio_monthly' // Replace with actual Stripe price ID
  }
};

class PaymentService {
  private stripePublishableKey: string;
  
  constructor() {
    // In production, this should come from environment variables
    this.stripePublishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_...';
  }

  /**
   * Create a Stripe Checkout session for payment
   */
  async createCheckoutSession(
    planId: string,
    userId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<PaymentSession> {
    const plan = PAYMENT_PLANS[planId];
    
    if (!plan) {
      throw new Error('Invalid payment plan');
    }

    try {
      // In a real implementation, this would call your backend API
      // which would then create a Stripe Checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: plan.stripePriceId,
          userId,
          planId,
          successUrl,
          cancelUrl,
          mode: plan.interval ? 'subscription' : 'payment'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const session = await response.json();
      
      return {
        id: session.id,
        url: session.url,
        status: 'pending'
      };

    } catch (error) {
      console.error('Payment session creation failed:', error);
      
      // For demo/development purposes, return a mock session
      if (process.env.NODE_ENV === 'development') {
        return {
          id: `demo_session_${Date.now()}`,
          url: `https://checkout.stripe.com/demo?plan=${planId}`,
          status: 'pending'
        };
      }
      
      throw error;
    }
  }

  /**
   * Check subscription status for a user
   */
  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    try {
      const response = await fetch(`/api/subscription-status/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription status');
      }

      const status = await response.json();
      
      return {
        isActive: status.isActive || false,
        plan: status.planId ? PAYMENT_PLANS[status.planId] : undefined,
        exportsRemaining: status.exportsRemaining || 0,
        renewsAt: status.renewsAt ? new Date(status.renewsAt) : undefined,
        customerId: status.customerId
      };

    } catch (error) {
      console.error('Failed to get subscription status:', error);
      
      // Return free tier status on error
      return {
        isActive: false,
        exportsRemaining: 0
      };
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });

      return response.ok;

    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      return false;
    }
  }

  /**
   * Record an export usage
   */
  async recordExportUsage(userId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/record-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });

      return response.ok;

    } catch (error) {
      console.error('Failed to record export usage:', error);
      return false;
    }
  }

  /**
   * Validate payment session completion
   */
  async validatePayment(sessionId: string): Promise<{
    success: boolean;
    planId?: string;
    userId?: string;
  }> {
    try {
      const response = await fetch(`/api/validate-payment/${sessionId}`, {
        method: 'GET'
      });

      if (!response.ok) {
        return { success: false };
      }

      const result = await response.json();
      return {
        success: true,
        planId: result.planId,
        userId: result.userId
      };

    } catch (error) {
      console.error('Payment validation failed:', error);
      return { success: false };
    }
  }

  /**
   * Get available plans for the UI
   */
  getAvailablePlans(): PaymentPlan[] {
    return Object.values(PAYMENT_PLANS);
  }

  /**
   * Calculate savings for annual plans (if implemented)
   */
  calculateSavings(monthlyPlan: PaymentPlan, annualPlan: PaymentPlan): number {
    const monthlyAnnualCost = monthlyPlan.price * 12;
    const savings = monthlyAnnualCost - annualPlan.price;
    return Math.round((savings / monthlyAnnualCost) * 100);
  }

  /**
   * Format price for display
   */
  formatPrice(price: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price);
  }

  /**
   * Check if user can export (has remaining credits/subscription)
   */
  canExport(subscriptionStatus: SubscriptionStatus): boolean {
    if (!subscriptionStatus.isActive) {
      return false;
    }

    if (subscriptionStatus.exportsRemaining === 'unlimited') {
      return true;
    }

    return subscriptionStatus.exportsRemaining > 0;
  }
}

// Export singleton instance
export const paymentService = new PaymentService();

// Helper functions for components
export function isPaidUser(subscriptionStatus: SubscriptionStatus): boolean {
  return subscriptionStatus.isActive;
}

export function getRemainingExports(subscriptionStatus: SubscriptionStatus): number | 'unlimited' {
  if (!subscriptionStatus.isActive) {
    return 0;
  }
  
  return subscriptionStatus.exportsRemaining;
}

export function formatPlanFeatures(features: string[]): string {
  return features.join(' • ');
}

// Mock functions for development
export const mockPaymentService = {
  async mockSuccessfulPayment(planId: string): Promise<SubscriptionStatus> {
    const plan = PAYMENT_PLANS[planId];
    
    return {
      isActive: true,
      plan,
      exportsRemaining: plan.exportsIncluded === 'unlimited' ? 'unlimited' : plan.exportsIncluded,
      renewsAt: plan.interval ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : undefined // 30 days from now
    };
  },

  async mockUsageDeduction(currentStatus: SubscriptionStatus): Promise<SubscriptionStatus> {
    if (currentStatus.exportsRemaining === 'unlimited') {
      return currentStatus;
    }

    return {
      ...currentStatus,
      exportsRemaining: Math.max(0, (currentStatus.exportsRemaining as number) - 1)
    };
  }
};

export default paymentService;