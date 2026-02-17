import { createPublicClient, http, formatUnits, parseUnits, encodeFunctionData } from 'viem';
import { baseSepolia } from 'viem/chains';
import { config } from '../config.js';

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

    // In the real product, this would generate an MPC wallet.
    // For the POC, we return the main server address as the agent's wallet address.
    async getAgentWallet(agentId: string): Promise<string> {
        // In a full implementation, we'd lookup or create a wallet for this ID
        return '0x...'; // Will be replaced by actual logic in payment service
    }
}
