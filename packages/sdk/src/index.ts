import {
    WeppoConfig,
    PaymentRequest,
    PaymentResponse,
    BalanceResponse,
    Service,
    CreateServiceRequest,
    PaymentIntent,
    CreatePaymentIntentRequest,
    PreAuthRequest,
    ChargeRequest
} from './types.js';
import { WeppoClient } from './client.js';

export * from './types.js';
export * from './errors.js';
export * from './x402.js';

/**
 * Weppo: The Consumer Abstraction Layer for Autonomous AI Agent Payments
 */
export class Weppo {
    private client: WeppoClient;

    constructor(config: WeppoConfig) {
        if (!config.apiKey) throw new Error('Weppo API Key is required');
        if (!config.agentId) throw new Error('Agent ID is required');

        this.client = new WeppoClient(config);
    }

    /**
     * Payments: Direct P2P transfers
     */
    async pay(recipient: string, amount: number) {
        return this.client.createPayment({
            to: recipient,
            amount,
            currency: 'USDC' // Default for now
        });
    }

    async preAuthorize(spender: string, maxAmount: number) {
        return this.client.preAuthorize({ spender, maxAmount });
    }

    async charge(from: string, amount: number, memo?: string) {
        return this.client.charge({ from, amount, memo });
    }

    async getBalance() {
        return this.client.getBalance();
    }

    /**
     * Market: Service Discovery
     */
    market = {
        /**
         * List available agent services.
         */
        list: async (): Promise<Service[]> => {
            return this.client.listServices();
        },

        /**
         * Register a new service.
         */
        register: async (params: CreateServiceRequest): Promise<Service> => {
            return this.client.createService(params);
        }
    };

    /**
     * Payment Intents: x402 Payment Requests
     */
    paymentIntent = {
        /**
         * Create a new Payment Intent.
         */
        create: async (params: CreatePaymentIntentRequest): Promise<PaymentIntent> => {
            return this.client.createPaymentIntent(params);
        },

        /**
         * Get status of a Payment Intent.
         */
        get: async (id: string): Promise<PaymentIntent> => {
            return this.client.getPaymentIntent(id);
        }
    };
}
