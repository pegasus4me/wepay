import { WeppoConfig, PaymentRequest, PaymentResponse, BalanceResponse, Service, CreateServiceRequest, PaymentIntent, CreatePaymentIntentRequest, PreAuthRequest, ChargeRequest } from './types.js';
export declare class WeppoClient {
    private apiKey;
    private agentId;
    private baseUrl;
    private account?;
    private publicClient;
    private forwarderAddress?;
    private weppoAddress?;
    constructor(config: WeppoConfig);
    private request;
    private handleError;
    /**
     * Signs a meta-transaction for ERC-2771 Forwarder (OpenZeppelin v5).
     */
    private signMetaTx;
    createPayment(params: PaymentRequest): Promise<PaymentResponse>;
    preAuthorize(params: PreAuthRequest): Promise<{
        txHash: string;
        status: string;
    }>;
    charge(params: ChargeRequest): Promise<PaymentResponse>;
    getBalance(): Promise<BalanceResponse>;
    getPayment(id: string): Promise<PaymentResponse>;
    createService(params: CreateServiceRequest): Promise<Service>;
    listServices(): Promise<Service[]>;
    createPaymentIntent(params: CreatePaymentIntentRequest): Promise<PaymentIntent>;
    getPaymentIntent(id: string): Promise<PaymentIntent>;
}
