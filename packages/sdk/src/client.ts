import { WePayConfig, PaymentRequest, PaymentResponse, BalanceResponse } from './types.js';
import { WePayError, AuthenticationError, InsufficientFundsError, PaymentFailedError } from './errors.js';

export class WePayClient {
    private apiKey: string;
    private agentId: string;
    private baseUrl: string;

    constructor(config: WePayConfig) {
        this.apiKey = config.apiKey;
        this.agentId = config.agentId;
        this.baseUrl = config.baseUrl || 'https://api.wepay.ai/v1';
    }

    private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
        const url = `${this.baseUrl}${path}`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Agent-Id': this.agentId,
            ...options.headers,
        };

        try {
            const response = await fetch(url, { ...options, headers });
            const data = await response.json();

            if (!response.ok) {
                this.handleError(response.status, data);
            }

            return data as T;
        } catch (error) {
            if (error instanceof WePayError) throw error;
            throw new WePayError(
                error instanceof Error ? error.message : 'Unknown communication error',
                'COMMUNICATION_ERROR',
                500
            );
        }
    }

    private handleError(status: number, data: any) {
        const message = data.message || 'An unexpected error occurred';
        const code = data.code;

        if (status === 401) throw new AuthenticationError(message);
        if (code === 'INSUFFICIENT_FUNDS') throw new InsufficientFundsError(message);
        if (code === 'PAYMENT_FAILED') throw new PaymentFailedError(message, data.hash);

        throw new WePayError(message, code, status);
    }

    async createPayment(params: PaymentRequest): Promise<PaymentResponse> {
        return this.request<PaymentResponse>('/payments', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    }

    async getBalance(): Promise<BalanceResponse> {
        return this.request<BalanceResponse>(`/wallets/${this.agentId}/balance`);
    }

    async getPayment(id: string): Promise<PaymentResponse> {
        return this.request<PaymentResponse>(`/payments/${id}`);
    }
}
