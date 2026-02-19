"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeppoClient = void 0;
const viem_1 = require("viem");
const accounts_1 = require("viem/accounts");
const chains_1 = require("viem/chains");
const errors_js_1 = require("./errors.js");
// Minimal ABIs
const FORWARDER_ABI = [
    {
        name: 'nonces',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'owner', type: 'address' }],
        outputs: [{ name: 'nonce', type: 'uint256' }],
    },
];
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
];
class WeppoClient {
    apiKey;
    agentId;
    baseUrl;
    // Web3 / Signing
    account;
    publicClient;
    forwarderAddress;
    weppoAddress;
    constructor(config) {
        this.apiKey = config.apiKey;
        this.agentId = config.agentId;
        this.baseUrl = config.baseUrl || 'https://api.weppo.ai/v1';
        if (config.privateKey) {
            this.account = (0, accounts_1.privateKeyToAccount)(config.privateKey);
            this.forwarderAddress = config.forwarderAddress;
            this.weppoAddress = config.weppoAddress;
            this.publicClient = (0, viem_1.createPublicClient)({
                chain: chains_1.baseSepolia,
                transport: (0, viem_1.http)(config.baseUrl ? undefined : 'https://sepolia.base.org'), // Default or provided
            });
        }
    }
    async request(path, options = {}) {
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
            return data;
        }
        catch (error) {
            if (error instanceof errors_js_1.WeppoError)
                throw error;
            throw new errors_js_1.WeppoError(error instanceof Error ? error.message : 'Unknown communication error', 'COMMUNICATION_ERROR', 500);
        }
    }
    handleError(status, data) {
        const message = data.message || 'An unexpected error occurred';
        const code = data.code;
        if (status === 401)
            throw new errors_js_1.AuthenticationError(message);
        if (code === 'INSUFFICIENT_FUNDS')
            throw new errors_js_1.InsufficientFundsError(message);
        if (code === 'PAYMENT_FAILED')
            throw new errors_js_1.PaymentFailedError(message, data.hash);
        throw new errors_js_1.WeppoError(message, code, status);
    }
    /**
     * Signs a meta-transaction for ERC-2771 Forwarder (OpenZeppelin v5).
     */
    async signMetaTx(to, data) {
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
                chainId: chains_1.baseSepolia.id,
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
                deadline: BigInt(deadline) // Cast to any to bypass TS check for now
            },
        });
        // Return object compatible with ForwardRequestData struct (signature embedded)
        return {
            from: request.from,
            to: request.to,
            value: request.value.toString(), // Convert to string for JSON
            gas: request.gas.toString(),
            nonce: request.nonce.toString(),
            deadline: request.deadline,
            data: request.data,
            signature
        };
    }
    async createPayment(params) {
        return this.request('/payments', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    }
    async preAuthorize(params) {
        if (this.account) {
            // Meta-Tx Flow
            if (!this.weppoAddress)
                throw new Error('Weppo Address required');
            // 1. Encode Data
            // Note: maxAmount needs access to decimals. ideally we read from chain or api.
            // For now assuming 6 decimals (USDC)
            const amountInUnits = BigInt(params.maxAmount * 1e6);
            const data = (0, viem_1.encodeFunctionData)({
                abi: WEPPO_ABI,
                functionName: 'preAuthorize',
                args: [params.spender, amountInUnits],
            });
            // 2. Sign
            const requestWithSignature = await this.signMetaTx(this.weppoAddress, data);
            // 3. Send to Relayer
            return this.request('/payments/pre-authorize-meta', {
                method: 'POST',
                body: JSON.stringify({ request: requestWithSignature }),
            });
        }
        // Old Flow (Custodial) - Deprecated but kept for compatibility
        return this.request('/payments/pre-authorize', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    }
    async charge(params) {
        if (this.account) {
            // Meta-Tx Flow
            if (!this.weppoAddress)
                throw new Error('Weppo Address required');
            const amountInUnits = BigInt(params.amount * 1e6);
            const data = (0, viem_1.encodeFunctionData)({
                abi: WEPPO_ABI,
                functionName: 'charge',
                args: [params.from, amountInUnits, params.memo || ''],
            });
            const requestWithSignature = await this.signMetaTx(this.weppoAddress, data);
            return this.request('/payments/charge-meta', {
                method: 'POST',
                body: JSON.stringify({ request: requestWithSignature }),
            });
        }
        return this.request('/payments/charge', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    }
    async getBalance() {
        return this.request(`/wallets/${this.agentId}/balance`);
    }
    async getPayment(id) {
        return this.request(`/payments/${id}`);
    }
    // --- Market (Service Registry) ---
    async createService(params) {
        return this.request('/market/services', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    }
    async listServices() {
        return this.request('/market/services');
    }
    // --- Payment Intents ---
    async createPaymentIntent(params) {
        return this.request('/payment-intents', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    }
    async getPaymentIntent(id) {
        return this.request(`/payment-intents/${id}`);
    }
}
exports.WeppoClient = WeppoClient;
