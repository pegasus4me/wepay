import { createPublicClient, createWalletClient, http, parseUnits, encodeFunctionData } from 'viem';
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

    async executePayment(recipient: string, amount: number): Promise<{ hash: string; gasUsed: bigint; effectiveGasPrice: bigint }> {
        if (!this.account) throw new Error('Private key not configured');

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
            args: [recipient as `0x${string}`, amountInUnits],
        });

        // Wait for confirmation to capture exact gas usage for paymaster
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
