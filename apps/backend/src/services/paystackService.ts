import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import { logger } from '../utils/logger';

export interface PaystackCustomer {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface PaystackTransaction {
  reference: string;
  amount: number;
  email: string;
  currency?: string;
  plan?: string;
  callback_url?: string;
  metadata?: Record<string, any>;
  channels?: string[];
}

export interface PaystackSubscription {
  customer: string;
  plan: string;
  authorization?: string;
  start_date?: string;
}

export interface PaystackPlan {
  name: string;
  interval: 'monthly' | 'yearly' | 'weekly' | 'daily';
  amount: number;
  currency?: string;
  description?: string;
  send_invoices?: boolean;
  send_sms?: boolean;
  hosted_page?: boolean;
}

export class PaystackService {
  private api: AxiosInstance;
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || '';
    
    if (!this.secretKey) {
      console.warn('PAYSTACK_SECRET_KEY not found in environment variables');
    }

    this.api = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        logger.error('Paystack API Error:', {
          status: error.response?.status,
          message: error.response?.data?.message,
          data: error.response?.data,
        });
        throw error;
      }
    );
  }

  // Initialize a transaction
  async initializeTransaction(data: PaystackTransaction) {
    try {
      const response = await this.api.post('/transaction/initialize', {
        reference: data.reference,
        amount: Math.round(data.amount * 100), // Convert to kobo/cents
        email: data.email,
        currency: data.currency || 'ZAR',
        callback_url: data.callback_url,
        metadata: data.metadata,
        channels: data.channels || ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to initialize Paystack transaction:', error);
      throw new Error(error.response?.data?.message || 'Failed to initialize payment');
    }
  }

  // Verify a transaction
  async verifyTransaction(reference: string) {
    try {
      const response = await this.api.get(`/transaction/verify/${reference}`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to verify Paystack transaction:', error);
      throw new Error(error.response?.data?.message || 'Failed to verify payment');
    }
  }

  // Create a customer
  async createCustomer(customer: PaystackCustomer) {
    try {
      const response = await this.api.post('/customer', customer);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to create Paystack customer:', error);
      throw new Error(error.response?.data?.message || 'Failed to create customer');
    }
  }

  // Create a plan
  async createPlan(plan: PaystackPlan) {
    try {
      const response = await this.api.post('/plan', {
        name: plan.name,
        interval: plan.interval,
        amount: Math.round(plan.amount * 100), // Convert to kobo/cents
        currency: plan.currency || 'ZAR',
        description: plan.description,
        send_invoices: plan.send_invoices || true,
        send_sms: plan.send_sms || true,
        hosted_page: plan.hosted_page || false,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to create Paystack plan:', error);
      throw new Error(error.response?.data?.message || 'Failed to create plan');
    }
  }

  // Create a subscription
  async createSubscription(subscription: PaystackSubscription) {
    try {
      const response = await this.api.post('/subscription', {
        customer: subscription.customer,
        plan: subscription.plan,
        authorization: subscription.authorization,
        start_date: subscription.start_date,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to create Paystack subscription:', error);
      throw new Error(error.response?.data?.message || 'Failed to create subscription');
    }
  }

  // Disable a subscription
  async disableSubscription(code: string, token: string) {
    try {
      const response = await this.api.post('/subscription/disable', {
        code,
        token,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to disable Paystack subscription:', error);
      throw new Error(error.response?.data?.message || 'Failed to disable subscription');
    }
  }

  // Get subscription details
  async getSubscription(idOrCode: string) {
    try {
      const response = await this.api.get(`/subscription/${idOrCode}`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get Paystack subscription:', error);
      throw new Error(error.response?.data?.message || 'Failed to get subscription');
    }
  }

  // List transactions
  async listTransactions(params?: {
    perPage?: number;
    page?: number;
    customer?: string;
    status?: 'failed' | 'success' | 'abandoned';
    from?: string;
    to?: string;
    amount?: number;
  }) {
    try {
      const response = await this.api.get('/transaction', { params });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to list Paystack transactions:', error);
      throw new Error(error.response?.data?.message || 'Failed to list transactions');
    }
  }

  // Validate webhook signature
  validateWebhookSignature(body: string, signature: string): boolean {
    try {
      const hash = crypto
        .createHmac('sha512', this.secretKey)
        .update(body, 'utf8')
        .digest('hex');
      
      return hash === signature;
    } catch (error) {
      logger.error('Failed to validate Paystack webhook signature:', error);
      return false;
    }
  }

  // Generate transaction reference
  generateReference(prefix: string = 'AIJS'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}_${timestamp}_${random}`;
  }

  // Get supported banks
  async getBanks(country: string = 'south-africa') {
    try {
      const response = await this.api.get('/bank', {
        params: { country }
      });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get Paystack banks:', error);
      throw new Error(error.response?.data?.message || 'Failed to get banks');
    }
  }

  // Resolve account number
  async resolveAccountNumber(accountNumber: string, bankCode: string) {
    try {
      const response = await this.api.get('/bank/resolve', {
        params: {
          account_number: accountNumber,
          bank_code: bankCode,
        }
      });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to resolve Paystack account:', error);
      throw new Error(error.response?.data?.message || 'Failed to resolve account');
    }
  }

  // Get transaction timeline
  async getTransactionTimeline(idOrReference: string) {
    try {
      const response = await this.api.get(`/transaction/timeline/${idOrReference}`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get Paystack transaction timeline:', error);
      throw new Error(error.response?.data?.message || 'Failed to get transaction timeline');
    }
  }

  // Charge authorization (for recurring payments)
  async chargeAuthorization(data: {
    authorization_code: string;
    email: string;
    amount: number;
    currency?: string;
    reference?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      const response = await this.api.post('/transaction/charge_authorization', {
        authorization_code: data.authorization_code,
        email: data.email,
        amount: Math.round(data.amount * 100), // Convert to kobo/cents
        currency: data.currency || 'ZAR',
        reference: data.reference,
        metadata: data.metadata,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Failed to charge Paystack authorization:', error);
      throw new Error(error.response?.data?.message || 'Failed to charge authorization');
    }
  }
}

export const paystackService = new PaystackService();