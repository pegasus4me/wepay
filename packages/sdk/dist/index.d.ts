import { WeppoConfig, PaymentResponse, BalanceResponse, Service, CreateServiceRequest, PaymentIntent, CreatePaymentIntentRequest } from './types.js';
export * from './types.js';
export * from './errors.js';
export * from './x402.js';
/**
 * Weppo: The Consumer Abstraction Layer for Autonomous AI Agent Payments
 */
export declare class Weppo {
    private client;
    constructor(config: WeppoConfig);
    /**
     * Payments: Direct P2P transfers
     */
    pay(recipient: string, amount: number): Promise<PaymentResponse>;
    preAuthorize(spender: string, maxAmount: number): Promise<{
        txHash: string;
        status: string;
    }>;
    charge(from: string, amount: number, memo?: string): Promise<PaymentResponse>;
    getBalance(): Promise<BalanceResponse>;
    /**
     * Market: Service Discovery
     */
    market: {
        /**
         * List available agent services.
         */
        list: () => Promise<Service[]>;
        /**
         * Register a new service.
         */
        register: (params: CreateServiceRequest) => Promise<Service>;
    };
    /**
     * Payment Intents: x402 Payment Requests
     */
    paymentIntent: {
        /**
         * Create a new Payment Intent.
         */
        create: (params: CreatePaymentIntentRequest) => Promise<PaymentIntent>;
        /**
         * Get status of a Payment Intent.
         */
        get: (id: string) => Promise<PaymentIntent>;
    };
}
