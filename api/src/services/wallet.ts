import { createPublicClient, http, formatUnits, parseUnits, encodeFunctionData, getAddress } from 'viem';
import { baseSepolia } from 'viem/chains';
import { config } from '../config.js';
import db from '../db.js';
import { CdpClient } from '@coinbase/cdp-sdk';

let cdp: CdpClient | null = null;
if (config.cdpApiKeyId && config.cdpApiKeySecret && config.cdpWalletSecret) {
    cdp = new CdpClient({
        apiKeyName: config.cdpApiKeyId,
        apiKeySecret: config.cdpApiKeySecret,
        walletSecret: config.cdpWalletSecret
    } as any);
}

// USDC ABI snip for balance and transfer
const USDC_ABI = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: 'balance', type: 'uint256' }],
    },
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

export class WalletService {
    private publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(config.rpcUrl),
    });

    async getBalance(address: string): Promise<{ amount: number; currency: string }> {
        try {
            const [balance, decimals] = await Promise.all([
                this.publicClient.readContract({
                    address: config.usdcAddress,
                    abi: USDC_ABI,
                    functionName: 'balanceOf',
                    args: [address as `0x${string}`],
                }),
                this.publicClient.readContract({
                    address: config.usdcAddress,
                    abi: USDC_ABI,
                    functionName: 'decimals',
                }),
            ]);

            return {
                amount: Number(formatUnits(balance, decimals)),
                currency: 'USDC',
            };
        } catch (error) {
            console.error('Error fetching balance:', error);
            return { amount: 0, currency: 'USDC' };
        }
    }

    async getAgentAddress(agentId: string): Promise<string> {
        const { data, error } = await db
            .from('agents')
            .select('wallet_address')
            .eq('id', agentId)
            .maybeSingle();

        if (error) throw new Error(`DB error fetching wallet: ${error.message}`);
        if (!data) throw new Error(`Agent ${agentId} not found`);
        return data.wallet_address;
    }

    async executeWithdrawal(agentId: string, toAddress: string, amount: number): Promise<{ hash: string }> {
        if (!cdp) throw new Error('CDP Client not configured');

        const fromAddress = await this.getAgentAddress(agentId);

        const decimals = await this.publicClient.readContract({
            address: config.usdcAddress,
            abi: USDC_ABI,
            functionName: 'decimals',
        });

        const amountInUnits = parseUnits(amount.toString(), decimals);

        const data = encodeFunctionData({
            abi: USDC_ABI,
            functionName: 'transfer',
            args: [getAddress(toAddress), amountInUnits]
        });

        console.log(`[WalletService] Withdrawal from ${fromAddress} to ${toAddress} amount ${amount}...`);

        const tx = await cdp.evm.sendTransaction({
            address: fromAddress,
            transaction: { to: config.usdcAddress, data, value: BigInt(0) },
            network: 'base-sepolia',
        });

        const hash = tx.transactionHash as `0x${string}`;
        // We don't wait for receipt here to keep it snappy for dashboard, 
        // but in a real app we'd track status.
        return { hash };
    }
}
