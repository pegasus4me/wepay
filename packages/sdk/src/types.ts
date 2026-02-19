export interface WeppoConfig {
    apiKey: string;
    agentId: string;
    baseUrl?: string;
    privateKey?: string; // Hex string, required for signing transactions
    forwarderAddress?: string; // Address of the MinimalForwarder contract
    weppoAddress?: string; // Address of the Weppo contract
}

export interface ForwardRequest {
    from: string;
    to: string;
    value: bigint;
    gas: bigint;
    nonce: bigint;
    deadline: number; // uint48
    data: string;
    signature?: string; // Embedded in v5 execute struct
}

export interface PaymentRequest {
    to?: string; // Optional if invoiceId is provided
    amount?: number; // Optional if invoiceId is provided
    currency?: string;
    memo?: string;
    productId?: string; // Optional for x402 Gateway purchases
    invoiceId?: string;
}

export interface PreAuthRequest {
    spender: string; // The agent ID or address to authorize
    maxAmount: number;
    currency?: string;
}

export interface ChargeRequest {
    from: string; // The agent ID or address to charge
    amount: number;
    currency?: string;
    memo?: string;
    invoiceId?: string; // Optional linkage to x402
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
    currency: string;
    endpointUrl: string;
    collateralAmount?: number;
}

export interface PaymentIntent {
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

export interface CreatePaymentIntentRequest {
    amount: number;
    currency: string;
    description?: string;
    payerId?: string;
}
