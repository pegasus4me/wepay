import { WePayConfig, PaymentRequest, PaymentResponse, BalanceResponse } from './types.js';
export declare class WePayClient {
    private apiKey;
    private agentId;
    private baseUrl;
    constructor(config: WePayConfig);
    private request;
    private handleError;
    createPayment(params: PaymentRequest): Promise<PaymentResponse>;
    getBalance(): Promise<BalanceResponse>;
    getPayment(id: string): Promise<PaymentResponse>;
}
