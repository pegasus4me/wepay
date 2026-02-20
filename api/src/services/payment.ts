import { createPublicClient, createWalletClient, http, parseUnits, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { config } from '../config.js';
import { CdpClient } from '@coinbase/cdp-sdk';
import db from '../db.js';

let cdp: CdpClient | null = null;
if (config.cdpApiKeyId && config.cdpApiKeySecret && config.cdpWalletSecret) {
    cdp = new CdpClient({
        apiKeyName: config.cdpApiKeyId,
        apiKeySecret: config.cdpApiKeySecret,
        walletSecret: config.cdpWalletSecret
    } as any);
}

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
] as const;

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
] as const;

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
] as const;

export class PaymentService {
    private account = config.privateKey ? privateKeyToAccount(config.privateKey) : null;

    private publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(config.rpcUrl),
    });

    private walletClient = createWalletClient({
        account: this.account!,
        chain: baseSepolia,
        transport: http(config.rpcUrl),
    });

    async executePayment(agentId: string, recipient: string, amount: number, productId?: string, memo?: string): Promise<{ hash: string; gasUsed: bigint; effectiveGasPrice: bigint }> {
        if (!cdp) throw new Error('CDP Client not configured');

        // Look up the agent's CDP Server Wallet address
        const agentRow = db.prepare('SELECT wallet_address FROM agents WHERE id = ?').get(agentId) as { wallet_address: string } | undefined;
        if (!agentRow || !agentRow.wallet_address) {
            throw new Error(`Wallet address not found for agent ${agentId}`);
        }
        const walletAddress = agentRow.wallet_address;

        // Route to x402 Purchase if productId is present
        if (productId) {
            return this.executePurchase(agentId, walletAddress, recipient, productId, amount, memo || '');
        }

        const decimals = await this.publicClient.readContract({
            address: config.usdcAddress,
            abi: USDC_ABI,
            functionName: 'decimals',
        });

        const amountInUnits = parseUnits(amount.toString(), decimals);

        const data = encodeFunctionData({
            abi: USDC_ABI,
            functionName: 'transfer',
            args: [recipient as `0x${string}`, amountInUnits]
        });

        console.log(`[PaymentService] Executing USDC transfer via CDP from ${walletAddress}...`);
        const transactionResult = await cdp.evm.sendTransaction({
            address: walletAddress,
            transaction: {
                to: config.usdcAddress,
                data: data,
                value: BigInt(0),
            },
            network: "base-sepolia",
        });

        const hash = transactionResult.transactionHash as `0x${string}`;

        // Wait for confirmation to capture exact gas usage for paymaster
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

        return {
            hash,
            gasUsed: receipt.gasUsed,
            effectiveGasPrice: receipt.effectiveGasPrice
        };
    }

    async executePurchase(agentId: string, walletAddress: string, gatewayAddress: string, productId: string, amount: number, memo: string): Promise<{ hash: string; gasUsed: bigint; effectiveGasPrice: bigint }> {
        if (!cdp) throw new Error('CDP Client not configured');
        // 1. Approve Gateway to spend USDC
        const decimals = await this.publicClient.readContract({
            address: config.usdcAddress,
            abi: USDC_ABI,
            functionName: 'decimals',
        });
        const amountInUnits = parseUnits(amount.toString(), decimals);

        console.log(`[PaymentService] Approving Gateway ${gatewayAddress} for ${amount} USDC via CDP...`);
        const approveData = encodeFunctionData({
            abi: [{
                name: 'approve',
                type: 'function',
                stateMutability: 'nonpayable',
                inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
                outputs: [{ name: 'success', type: 'bool' }]
            }],
            functionName: 'approve',
            args: [gatewayAddress as `0x${string}`, amountInUnits],
        });

        const approveTx = await cdp.evm.sendTransaction({
            address: walletAddress,
            transaction: {
                to: config.usdcAddress,
                data: approveData,
                value: BigInt(0),
            },
            network: "base-sepolia",
        });
        await this.publicClient.waitForTransactionReceipt({ hash: approveTx.transactionHash as `0x${string}` });

        // 2. Call buy() on Gateway
        let productIdBigInt: bigint;
        try {
            productIdBigInt = BigInt(productId);
        } catch {
            productIdBigInt = BigInt(0);
            console.warn(`[PaymentService] Warning: Could not parse productId '${productId}' as BigInt. Using 0.`);
        }

        console.log(`[PaymentService] Executing buy() on Gateway for Product ID ${productIdBigInt} via CDP...`);
        const buyData = encodeFunctionData({
            abi: MERCHANT_GATEWAY_ABI,
            functionName: 'buy',
            args: [productIdBigInt, memo],
        });

        const buyTx = await cdp.evm.sendTransaction({
            address: walletAddress,
            transaction: {
                to: gatewayAddress,
                data: buyData,
                value: BigInt(0),
            },
            network: "base-sepolia",
        });

        const hash = buyTx.transactionHash as `0x${string}`;

        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

        return {
            hash,
            gasUsed: receipt.gasUsed,
            effectiveGasPrice: receipt.effectiveGasPrice
        };
    }

    async executePreAuth(spenderId: string, maxAmount: number): Promise<{ hash: string }> {
        if (!this.account) throw new Error('Private key not configured');

        // Lookup spender's wallet address if it's an agentId
        let spenderAddress = spenderId;
        if (!spenderId.startsWith('0x')) {
            const agentRow = db.prepare('SELECT wallet_address FROM agents WHERE id = ?').get(spenderId) as { wallet_address: string } | undefined;
            if (!agentRow) throw new Error(`Agent ${spenderId} not found`);
            spenderAddress = agentRow.wallet_address;
        }

        const decimals = await this.publicClient.readContract({
            address: config.usdcAddress,
            abi: USDC_ABI,
            functionName: 'decimals',
        });
        const amountInUnits = parseUnits(maxAmount.toString(), decimals);

        const hash = await this.walletClient.writeContract({
            address: config.weppoAddress,
            abi: WEPPO_ABI,
            functionName: 'preAuthorize',
            args: [spenderAddress as `0x${string}`, amountInUnits],
        });

        await this.publicClient.waitForTransactionReceipt({ hash });
        return { hash };
    }

    async executeCharge(fromId: string, amount: number, memo: string): Promise<{ hash: string; gasUsed: bigint; effectiveGasPrice: bigint }> {
        if (!this.account) throw new Error('Private key not configured');

        // Lookup sender's wallet address if it's an agentId
        let fromAddress = fromId;
        if (!fromId.startsWith('0x')) {
            const agentRow = db.prepare('SELECT wallet_address FROM agents WHERE id = ?').get(fromId) as { wallet_address: string } | undefined;
            if (!agentRow) throw new Error(`Agent ${fromId} not found`);
            fromAddress = agentRow.wallet_address;
        }

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
            args: [fromAddress as `0x${string}`, amountInUnits, memo],
        });

        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

        return {
            hash,
            gasUsed: receipt.gasUsed,
            effectiveGasPrice: receipt.effectiveGasPrice
        };
    }

    async relayTransaction(request: any): Promise<{ hash: string; gasUsed: bigint; effectiveGasPrice: bigint }> {
        if (!this.account) throw new Error('Private key not configured');

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
        ] as const;

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
            signature: request.signature as `0x${string}`,
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

    getExplorerUrl(hash: string): string {
        return `https://sepolia.basescan.org/tx/${hash}`;
    }
}
