import { WeppoConfig, PaymentRequest, PaymentResponse, BalanceResponse, Service, CreateServiceRequest, Invoice, CreateInvoiceRequest, PreAuthRequest, ChargeRequest } from './types.js';
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
     * Execute a payment. The agent does not need to handle wallets or keys.
     */
    async pay(params: PaymentRequest): Promise<PaymentResponse> {
        console.log(`[Weppo] Initiating payment of ${params.amount} ${params.currency} to ${params.to}`);
        const response = await this.client.createPayment(params);
        console.log(`[Weppo] Payment settled. ID: ${response.id}, Status: ${response.status}`);
        return response;
    }

    /**
     * Pre-Authorize an agent to charge your account (Pull Payment Setup).
     */
    async preAuthorize(params: PreAuthRequest): Promise<{ txHash: string, status: string }> {
        console.log(`[Weppo] Pre-Authorizing ${params.spender} for up to ${params.maxAmount} USDC`);
        return this.client.preAuthorize(params);
    }

    /**
     * Charge another agent who has pre-authorized you (Pull Payment Execution).
     */
    async charge(params: ChargeRequest): Promise<PaymentResponse> {
        console.log(`[Weppo] Charging ${params.from} for ${params.amount} USDC`);
        return this.client.charge(params);
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

    /**
     * Agent Market: Discovery & Commerce
     */
    public market = {
        /**
         * List a service in the Weppo Registry.
         */
        list: async (params: CreateServiceRequest): Promise<Service> => {
            return this.client.createService(params);
        },

        /**
         * Find available services.
         */
        find: async (): Promise<Service[]> => {
            return this.client.listServices();
        }
    };

    /**
     * Invoices: Payment Links
     */
    public invoice = {
        /**
         * Create a new Payment Link / Invoice.
         */
        create: async (params: CreateInvoiceRequest): Promise<Invoice> => {
            return this.client.createInvoice(params);
        },

        /**
         * Get an invoice by ID.
         */
        get: async (id: string): Promise<Invoice> => {
            return this.client.getInvoice(id);
        }
    };
}
