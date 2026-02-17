import { WePayConfig, PaymentRequest, PaymentResponse, BalanceResponse } from './types.js';
export * from './types.js';
export * from './errors.js';
/**
 * WePay: The Consumer Abstraction Layer for Autonomous AI Agent Payments
 */
export declare class WePay {
    private client;
    constructor(config: WePayConfig);
    /**
     * Execute a payment. The agent does not need to handle wallets or keys.
     */
    pay(params: PaymentRequest): Promise<PaymentResponse>;
    /**
     * Check the agent's available balance.
     */
    getBalance(): Promise<BalanceResponse>;
    /**
     * Get historical details of a payment.
     */
    getPaymentDetails(paymentId: string): Promise<PaymentResponse>;
}
