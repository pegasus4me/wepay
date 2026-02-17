export interface WeppoConfig {
    apiKey: string;
    agentId: string;
    baseUrl?: string;
}

export interface PaymentRequest {
    to?: string; // Optional if invoiceId is provided
    amount?: number; // Optional if invoiceId is provided
    currency?: string;
    memo?: string;
    productId?: string; // Optional for x402 Gateway purchases
    invoiceId?: string;
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

export interface Service {
    id: string;
    providerAgentId: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    endpointUrl: string;
    collateralAmount: number;
    createdAt: string;
}

export interface CreateServiceRequest {
    name: string;
    description?: string;
    price: number;
    currency?: string;
    endpointUrl: string;
    collateralAmount?: number;
}

export interface Invoice {
    id: string;
    agentId: string;
    amount: number;
    currency: string;
    description?: string;
    status: 'pending' | 'paid' | 'cancelled';
    payerId?: string;
    paymentHash?: string;
    createdAt: string;
    payLink?: string;
}

export interface CreateInvoiceRequest {
    amount: number;
    currency?: string;
    description?: string;
    payerId?: string;
}
