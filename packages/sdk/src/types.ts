export interface WePayConfig {
    apiKey: string;
    agentId: string;
    baseUrl?: string;
}

export interface PaymentRequest {
    to: string;
    amount: number;
    currency?: string;
    memo?: string;
    productId?: string; // Optional for x402 Gateway purchases
}

export interface PaymentResponse {
    id: string;
    status: 'pending' | 'confirmed' | 'failed';
    amount: number;
    currency: string;
    to: string;
    hash?: string;
    explorerUrl?: string;
    createdAt: string;
}

export interface BalanceResponse {
    amount: number;
    currency: string;
    walletAddress: string;
}
