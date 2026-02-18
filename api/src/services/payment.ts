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

    async executePreAuth(spender: string, maxAmount: number): Promise<{ hash: string }> {
        if (!this.account) throw new Error('Private key not configured');

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
            args: [spender as `0x${string}`, amountInUnits],
        });

        await this.publicClient.waitForTransactionReceipt({ hash });
        return { hash };
    }

    async executeCharge(from: string, amount: number, memo: string): Promise<{ hash: string; gasUsed: bigint; effectiveGasPrice: bigint }> {
        if (!this.account) throw new Error('Private key not configured');

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
            args: [from as `0x${string}`, amountInUnits, memo],
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
