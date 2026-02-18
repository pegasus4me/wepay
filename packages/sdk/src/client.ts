import { createPublicClient, createWalletClient, http, encodeFunctionData, Hex, PrivateKeyAccount, Hash } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { WeppoConfig, PaymentRequest, PaymentResponse, BalanceResponse, Service, CreateServiceRequest, Invoice, CreateInvoiceRequest, PreAuthRequest, ChargeRequest, ForwardRequest } from './types.js';
import { WeppoError, AuthenticationError, InsufficientFundsError, PaymentFailedError } from './errors.js';

// Minimal ABIs
const FORWARDER_ABI = [
    {
        name: 'nonces',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'owner', type: 'address' }],
        outputs: [{ name: 'nonce', type: 'uint256' }],
    },
] as const;

const WEPPO_ABI = [
    {
        name: 'preAuthorize',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'spender', type: 'address' }, { name: 'maxAmount', type: 'uint256' }],
        outputs: [],
    },
    {
        name: 'charge',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'from', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'memo', type: 'string' }],
        outputs: [],
    },
] as const;

export class WeppoClient {
    private apiKey: string;
    private agentId: string;
    private baseUrl: string;

    // Web3 / Signing
    private account?: PrivateKeyAccount;
    private publicClient: any;
    private forwarderAddress?: Hex;
    private weppoAddress?: Hex;

    constructor(config: WeppoConfig) {
        this.apiKey = config.apiKey;
        this.agentId = config.agentId;
        this.baseUrl = config.baseUrl || 'https://api.weppo.ai/v1';

        if (config.privateKey) {
            this.account = privateKeyToAccount(config.privateKey as Hex);
            this.forwarderAddress = config.forwarderAddress as Hex;
            this.weppoAddress = config.weppoAddress as Hex;

            this.publicClient = createPublicClient({
                chain: baseSepolia,
                transport: http(config.baseUrl ? undefined : 'https://sepolia.base.org'), // Default or provided
            });
        }
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
            if (error instanceof WeppoError) throw error;
            throw new WeppoError(
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

        throw new WeppoError(message, code, status);
    }

    /**
     * Signs a meta-transaction for ERC-2771 Forwarder (OpenZeppelin v5).
     */
    private async signMetaTx(to: Hex, data: Hex): Promise<ForwardRequest> {
        if (!this.account || !this.forwarderAddress) {
            throw new Error('Private Key and Forwarder Address required for signing');
        }

        const from = this.account.address;

        // 1. Get Nonce
        const nonce = await this.publicClient.readContract({
            address: this.forwarderAddress,
            abi: FORWARDER_ABI,
            functionName: 'nonces',
            args: [from],
        });

        // 2. Set Deadline (e.g. 1 hour from now)
        const deadline = Math.floor(Date.now() / 1000) + 3600;

        // 3. Create Request
        const request = {
            from,
            to,
            value: 0n,
            gas: 500000n, // Hardcoded gas limit for now
            nonce,
            deadline,
            data,
        };

        // 4. Sign EIP-712
        const signature = await this.account.signTypedData({
            domain: {
                name: 'WeppoForwarder', // Must match the name in contract constructor
                version: '1', // ERC2771Forwarder default version is "1"
                chainId: baseSepolia.id,
                verifyingContract: this.forwarderAddress,
            },
            types: {
                ForwardRequest: [
                    { name: 'from', type: 'address' },
                    { name: 'to', type: 'address' },
                    { name: 'value', type: 'uint256' },
                    { name: 'gas', type: 'uint256' },
                    { name: 'nonce', type: 'uint256' },
                    { name: 'deadline', type: 'uint48' },
                    { name: 'data', type: 'bytes' },
                ],
            },
            primaryType: 'ForwardRequest',
            message: {
                ...request,
                deadline: BigInt(deadline) // viem expects BigInt for uint48
            },
        });

        // Return object compatible with ForwardRequestData struct (signature embedded)
        return {
            from: request.from,
            to: request.to,
            value: request.value.toString() as any, // Convert to string for JSON
            gas: request.gas.toString() as any,
            nonce: request.nonce.toString() as any,
            deadline: request.deadline,
            data: request.data,
            signature
        } as unknown as ForwardRequest;
    }

    async createPayment(params: PaymentRequest): Promise<PaymentResponse> {
        return this.request<PaymentResponse>('/payments', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    }

    async preAuthorize(params: PreAuthRequest): Promise<{ txHash: string, status: string }> {
        if (this.account) {
            // Meta-Tx Flow
            if (!this.weppoAddress) throw new Error('Weppo Address required');

            // 1. Encode Data
            // Note: maxAmount needs access to decimals. ideally we read from chain or api.
            // For now assuming 6 decimals (USDC)
            const amountInUnits = BigInt(params.maxAmount * 1e6);

            const data = encodeFunctionData({
                abi: WEPPO_ABI,
                functionName: 'preAuthorize',
                args: [params.spender as Hex, amountInUnits],
            });

            // 2. Sign
            const requestWithSignature = await this.signMetaTx(this.weppoAddress, data);

            // 3. Send to Relayer
            return this.request<{ txHash: string, status: string }>('/payments/pre-authorize-meta', {
                method: 'POST',
                body: JSON.stringify({ request: requestWithSignature }),
            });
        }

        // Old Flow (Custodial) - Deprecated but kept for compatibility
        return this.request<{ txHash: string, status: string }>('/payments/pre-authorize', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    }

    async charge(params: ChargeRequest): Promise<PaymentResponse> {
        if (this.account) {
            // Meta-Tx Flow
            if (!this.weppoAddress) throw new Error('Weppo Address required');

            const amountInUnits = BigInt(params.amount * 1e6);

            const data = encodeFunctionData({
                abi: WEPPO_ABI,
                functionName: 'charge',
                args: [params.from as Hex, amountInUnits, params.memo || ''],
            });

            const requestWithSignature = await this.signMetaTx(this.weppoAddress, data);

            return this.request<PaymentResponse>('/payments/charge-meta', {
                method: 'POST',
                body: JSON.stringify({ request: requestWithSignature }),
            });
        }

        return this.request<PaymentResponse>('/payments/charge', {
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

    // --- Market (Service Registry) ---

    async createService(params: CreateServiceRequest): Promise<Service> {
        return this.request<Service>('/market/services', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    }

    async listServices(): Promise<Service[]> {
        return this.request<Service[]>('/market/services');
    }

    // --- Invoices ---

    async createInvoice(params: CreateInvoiceRequest): Promise<Invoice> {
        return this.request<Invoice>('/invoices', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    }

    async getInvoice(id: string): Promise<Invoice> {
        return this.request<Invoice>(`/invoices/${id}`);
    }
}
