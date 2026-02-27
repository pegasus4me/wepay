import { createPublicClient, createWalletClient, http, parseUnits, encodeFunctionData, getAddress } from 'viem';
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
        name: 'transferWithAuthorization',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'validAfter', type: 'uint256' },
            { name: 'validBefore', type: 'uint256' },
            { name: 'nonce', type: 'bytes32' },
            { name: 'v', type: 'uint8' },
            { name: 'r', type: 'bytes32' },
            { name: 's', type: 'bytes32' }
        ],
        outputs: [],
    },
    {
        name: 'decimals',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: 'decimals', type: 'uint8' }],
    },
] as const;

// Helper: look up agent's CDP wallet address from DB
async function getWalletAddress(agentId: string): Promise<string> {
    const { data, error } = await db
        .from('agents')
        .select('wallet_address')
        .eq('id', agentId)
        .maybeSingle();
    if (error) throw new Error(`DB error for agent ${agentId}: ${error.message}`);
    if (!data || !data.wallet_address) throw new Error(`Wallet address not found for agent ${agentId}`);
    return data.wallet_address;
}

// Helper: resolve an agentId OR raw 0x address to an EVM address
async function resolveAddress(idOrAddress: string): Promise<string> {
    if (idOrAddress.startsWith('0x')) return getAddress(idOrAddress);
    return getWalletAddress(idOrAddress);
}

// Helper: get USDC decimals
async function getUsdcDecimals(publicClient: any): Promise<number> {
    return publicClient.readContract({
        address: config.usdcAddress,
        abi: USDC_ABI,
        functionName: 'decimals',
    });
}

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

    private async logTransaction(data: {
        hash: string;
        agentId: string;
        recipient: string;
        amount: number;
        currency?: string;
        memo?: string;
        type: string;
        gasUsed?: bigint;
        effectiveGasPrice?: bigint;
    }) {
        try {
            await db.from('transactions').insert({
                hash: data.hash,
                agent_id: data.agentId,
                recipient: data.recipient,
                amount: data.amount,
                currency: data.currency || 'USDC',
                memo: data.memo || null,
                type: data.type,
                gas_used: data.gasUsed?.toString(),
                effective_gas_price: data.effectiveGasPrice?.toString(),
            });
            console.log(`[DB] Logged transaction ${data.hash}`);
        } catch (e) {
            console.error(`[DB] Failed to log transaction ${data.hash}:`, e);
        }
    }

    // -------------------------------------------------------------------------
    // Direct P2P Payment (USDC transfer)
    // -------------------------------------------------------------------------
    async executePayment(agentId: string, recipient: string, amount: number, productId?: string, memo?: string): Promise<{ hash: string; gasUsed: bigint; effectiveGasPrice: bigint }> {
        if (!cdp) throw new Error('CDP Client not configured');

        const walletAddress = await getWalletAddress(agentId);

        const decimals = await getUsdcDecimals(this.publicClient);
        const amountInUnits = parseUnits(amount.toString(), decimals);

        const data = encodeFunctionData({
            abi: USDC_ABI,
            functionName: 'transfer',
            args: [getAddress(recipient), amountInUnits]
        });

        console.log(`[PaymentService] USDC transfer via CDP from ${walletAddress}...`);
        const tx = await cdp.evm.sendTransaction({
            address: walletAddress,
            transaction: { to: config.usdcAddress, data, value: BigInt(0) },
            network: 'base-sepolia',
        });

        const hash = tx.transactionHash as `0x${string}`;
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

        await this.logTransaction({
            hash,
            agentId,
            recipient,
            amount,
            memo,
            type: 'payment',
            gasUsed: receipt.gasUsed,
            effectiveGasPrice: receipt.effectiveGasPrice
        });

        return { hash, gasUsed: receipt.gasUsed, effectiveGasPrice: receipt.effectiveGasPrice };
    }

    // -------------------------------------------------------------------------
    // Open Economy x402 Settlement (EIP-3009)
    // Relays a signed transferWithAuthorization directly to USDC contract
    // -------------------------------------------------------------------------
    async relayEip3009(sellerAgentId: string, eip3009Payload: any): Promise<{ hash: string; gasUsed: bigint; effectiveGasPrice: bigint }> {
        if (!cdp) throw new Error('CDP Client not configured');
        
        // The seller is the one receiving the payment. They pay the gas via their CDP wallet.
        const relayerAddress = await getWalletAddress(sellerAgentId);

        const { from, to, value, validAfter, validBefore, nonce, v, r, s } = eip3009Payload;

        const data = encodeFunctionData({
            abi: USDC_ABI,
            functionName: 'transferWithAuthorization',
            args: [from, to, BigInt(value), BigInt(validAfter), BigInt(validBefore), nonce, v, r, s]
        });

        console.log(`[PaymentService] Relaying EIP-3009 signature for ${value} USDC from ${from} to ${to}...`);
        
        const tx = await cdp.evm.sendTransaction({
            address: relayerAddress,
            transaction: { to: config.usdcAddress, data, value: BigInt(0) },
            network: 'base-sepolia',
        });

        const hash = tx.transactionHash as `0x${string}`;
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

        // Log the relayed meta-transaction
        await this.logTransaction({
            hash,
            agentId: from,
            recipient: to,
            amount: Number(value) / 1e6, // Assuming 6 decimals
            memo: `x402 Settled via EIP-3009`,
            type: 'eip3009_transfer',

            gasUsed: receipt.gasUsed,
            effectiveGasPrice: receipt.effectiveGasPrice
        });

        return { hash, gasUsed: receipt.gasUsed, effectiveGasPrice: receipt.effectiveGasPrice };
    }

    getExplorerUrl(hash: string): string {
        return `https://sepolia.basescan.org/tx/${hash}`;
    }
}
