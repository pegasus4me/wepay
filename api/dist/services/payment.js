import { createPublicClient, createWalletClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { config } from '../config.js';
const USDC_ABI = [
    {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'recipient', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: 'success', type: 'bool' }],
    },
    {
        name: 'decimals',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: 'decimals', type: 'uint8' }],
    },
];
const WEPPO_ABI = [
    {
        name: 'preAuthorize',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'maxAmount', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        name: 'charge',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'from', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'memo', type: 'string' },
        ],
        outputs: [],
    },
];
const MERCHANT_GATEWAY_ABI = [
    {
        name: 'buy',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: '_productId', type: 'uint256' },
            { name: '_memo', type: 'string' }
        ],
        outputs: [],
    },
];
export class PaymentService {
    account = config.privateKey ? privateKeyToAccount(config.privateKey) : null;
    publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(config.rpcUrl),
    });
    walletClient = createWalletClient({
        account: this.account,
        chain: baseSepolia,
        transport: http(config.rpcUrl),
    });
    async executePayment(recipient, amount, productId, memo) {
        if (!this.account)
            throw new Error('Private key not configured');
        // Route to x402 Purchase if productId is present
        if (productId) {
            return this.executePurchase(recipient, productId, amount, memo || '');
        }
        const decimals = await this.publicClient.readContract({
            address: config.usdcAddress,
            abi: USDC_ABI,
            functionName: 'decimals',
        });
        const amountInUnits = parseUnits(amount.toString(), decimals);
        const hash = await this.walletClient.writeContract({
            address: config.usdcAddress,
            abi: USDC_ABI,
            functionName: 'transfer',
            args: [recipient, amountInUnits],
        });
        // Wait for confirmation to capture exact gas usage for paymaster
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
        return {
            hash,
            gasUsed: receipt.gasUsed,
            effectiveGasPrice: receipt.effectiveGasPrice
        };
    }
    async executePurchase(gatewayAddress, productId, amount, memo) {
        // 1. Approve Gateway to spend USDC
        // Note: Ideally we check allowance first, but for POC we just approve exact amount (or max)
        const decimals = await this.publicClient.readContract({
            address: config.usdcAddress,
            abi: USDC_ABI,
            functionName: 'decimals',
        });
        const amountInUnits = parseUnits(amount.toString(), decimals);
        console.log(`[PaymentService] Approving Gateway ${gatewayAddress} for ${amount} USDC...`);
        const approveHash = await this.walletClient.writeContract({
            address: config.usdcAddress,
            abi: [{
                    name: 'approve',
                    type: 'function',
                    stateMutability: 'nonpayable',
                    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
                    outputs: [{ name: 'success', type: 'bool' }]
                }],
            functionName: 'approve',
            args: [gatewayAddress, amountInUnits],
        });
        await this.publicClient.waitForTransactionReceipt({ hash: approveHash });
        // 2. Call buy() on Gateway
        // Only numeric product IDs supported by contract for now (uint256)
        // If productId is a string (e.g. 'prod_123'), we need to hash it or parse it.
        // For this demo, let's assume we pass a numeric ID as string, OR we hash it if it looks like a string.
        // Actually, MerchantGateway.sol uses uint256. Let's try to parse, else hash.
        let productIdBigInt;
        try {
            productIdBigInt = BigInt(productId);
        }
        catch {
            // fast hash
            // In real app, we might need a registry mapping. For now, simple hash or error.
            // Let's fallback to 0 or throw if not numeric, as the contract expects uint256.
            // Or use a hash.
            // Simple consistent hash for demo strings:
            productIdBigInt = BigInt(0); // Placeholder if parsing fails
            console.warn(`[PaymentService] Warning: Could not parse productId '${productId}' as BigInt. Using 0.`);
        }
        console.log(`[PaymentService] Executing buy() on Gateway for Product ID ${productIdBigInt}...`);
        const hash = await this.walletClient.writeContract({
            address: gatewayAddress,
            abi: MERCHANT_GATEWAY_ABI,
            functionName: 'buy',
            args: [productIdBigInt, memo],
        });
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
        return {
            hash,
            gasUsed: receipt.gasUsed,
            effectiveGasPrice: receipt.effectiveGasPrice
        };
    }
    async executePreAuth(spender, maxAmount) {
        if (!this.account)
            throw new Error('Private key not configured');
        // Note: In production, the user would sign this. For the POC, the server signs on behalf of the user/agent.
        const decimals = await this.publicClient.readContract({
            address: config.usdcAddress,
            abi: USDC_ABI, // USDC has decimals
            functionName: 'decimals',
        });
        const amountInUnits = parseUnits(maxAmount.toString(), decimals);
        const hash = await this.walletClient.writeContract({
            address: config.weppoAddress,
            abi: WEPPO_ABI,
            functionName: 'preAuthorize',
            args: [spender, amountInUnits],
        });
        await this.publicClient.waitForTransactionReceipt({ hash });
        return { hash };
    }
    async executeCharge(from, amount, memo) {
        if (!this.account)
            throw new Error('Private key not configured');
        const decimals = await this.publicClient.readContract({
            address: config.usdcAddress,
            abi: USDC_ABI,
            functionName: 'decimals',
        });
        const amountInUnits = parseUnits(amount.toString(), decimals);
        const hash = await this.walletClient.writeContract({
            address: config.weppoAddress,
            abi: WEPPO_ABI,
            functionName: 'charge',
            args: [from, amountInUnits, memo],
        });
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
        return {
            hash,
            gasUsed: receipt.gasUsed,
            effectiveGasPrice: receipt.effectiveGasPrice
        };
    }
    async relayTransaction(request) {
        if (!this.account)
            throw new Error('Private key not configured');
        const ForwarderABI = [
            {
                name: 'execute',
                type: 'function',
                stateMutability: 'payable',
                inputs: [
                    {
                        components: [
                            { name: 'from', type: 'address' },
                            { name: 'to', type: 'address' },
                            { name: 'value', type: 'uint256' },
                            { name: 'gas', type: 'uint256' },
                            { name: 'deadline', type: 'uint48' },
                            { name: 'data', type: 'bytes' },
                            { name: 'signature', type: 'bytes' },
                        ],
                        name: 'request',
                        type: 'tuple',
                    },
                ],
                outputs: [{ name: 'success', type: 'bool' }],
            },
        ];
        // Ensure request values are BigInt
        const safeRequest = {
            from: request.from,
            to: request.to,
            value: BigInt(request.value),
            gas: BigInt(request.gas),
            // Nonce is NOT in the struct in v5, it's verified by signature but NOT passed in calldata?
            // Wait, looking at ERC2771Forwarder.sol again:
            // struct ForwardRequestData { from, to, value, gas, deadline, data, signature }
            // No nonce in struct.
            deadline: Number(request.deadline),
            data: request.data,
            signature: request.signature,
        };
        const hash = await this.walletClient.writeContract({
            address: config.forwarderAddress,
            abi: ForwarderABI,
            functionName: 'execute',
            args: [safeRequest],
        });
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
        return {
            hash,
            gasUsed: receipt.gasUsed,
            effectiveGasPrice: receipt.effectiveGasPrice
        };
    }
    getExplorerUrl(hash) {
        return `https://sepolia.basescan.org/tx/${hash}`;
    }
}
