import { WePayConfig, PaymentRequest, PaymentResponse, BalanceResponse } from './types.js';
import { WePayClient } from './client.js';

export * from './types.js';
export * from './errors.js';

/**
 * WePay: The Consumer Abstraction Layer for Autonomous AI Agent Payments
 */
export class WePay {
    private client: WePayClient;

    constructor(config: WePayConfig) {
        if (!config.apiKey) throw new Error('WePay API Key is required');
        if (!config.agentId) throw new Error('Agent ID is required');

        this.client = new WePayClient(config);
    }

    /**
     * Execute a payment. The agent does not need to handle wallets or keys.
     */
    async pay(params: PaymentRequest): Promise<PaymentResponse> {
        console.log(`[WePay] Initiating payment of ${params.amount} ${params.currency} to ${params.to}`);
        const response = await this.client.createPayment(params);
        console.log(`[WePay] Payment settled. ID: ${response.id}, Status: ${response.status}`);
        return response;
    }

    /**
     * Check the agent's available balance.
     */
    async getBalance(): Promise<BalanceResponse> {
        return this.client.getBalance();
    }

    /**
     * Get historical details of a payment.
     */
    async getPaymentDetails(paymentId: string): Promise<PaymentResponse> {
        return this.client.getPayment(paymentId);
    }
}
