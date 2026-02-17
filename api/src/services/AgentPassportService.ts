import { createPublicClient, createWalletClient, http, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { config } from '../config.js';
import db from '../db.js';

const PASSPORT_ABI = [
    {
        name: 'mint',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'agent', type: 'address' }],
        outputs: [],
    },
    {
        name: 'updateReputation',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'agent', type: 'address' },
            { name: 'score', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        name: 'reputationScore',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        outputs: [{ name: 'score', type: 'uint256' }],
    },
    {
        name: 'agentToTokenId',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'agent', type: 'address' }],
        outputs: [{ name: 'tokenId', type: 'uint256' }],
    },
] as const;

export class AgentPassportService {
    private account = config.privateKey ? privateKeyToAccount(config.privateKey) : null;

    // Passport Contract Address - TODO: Update after deployment
    private contractAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;

    private publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(config.rpcUrl),
    });

    private walletClient = createWalletClient({
        account: this.account!,
        chain: baseSepolia,
        transport: http(config.rpcUrl),
    });

    /**
     * Mints a Soulbound Passport for a new agent.
     */
    async mintPassport(agentAddress: string) {
        if (!this.account) throw new Error('Private key missing');

        const hash = await this.walletClient.writeContract({
            address: this.contractAddress,
            abi: PASSPORT_ABI,
            functionName: 'mint',
            args: [agentAddress as `0x${string}`],
        });

        console.log(`[Passport] Minted SBT for ${agentAddress}. Hash: ${hash}`);
        return hash;
    }

    /**
     * Updates an agent's reputation score on-chain.
     */
    async updateReputation(agentAddress: string, newScore: number) {
        if (!this.account) throw new Error('Private key missing');

        const hash = await this.walletClient.writeContract({
            address: this.contractAddress,
            abi: PASSPORT_ABI,
            functionName: 'updateReputation',
            args: [agentAddress as `0x${string}`, BigInt(newScore)],
        });

        console.log(`[Passport] Updated reputation for ${agentAddress} to ${newScore}. Hash: ${hash}`);
        return hash;
    }

    /**
     * Reads the current reputation score from the blockchain.
     */
    async getReputation(agentAddress: string): Promise<number> {
        try {
            const tokenId = await this.publicClient.readContract({
                address: this.contractAddress,
                abi: PASSPORT_ABI,
                functionName: 'agentToTokenId',
                args: [agentAddress as `0x${string}`],
            });

            if (tokenId === BigInt(0)) return 0; // No passport

            const score = await this.publicClient.readContract({
                address: this.contractAddress,
                abi: PASSPORT_ABI,
                functionName: 'reputationScore',
                args: [tokenId],
            });

            return Number(score);
        } catch (error) {
            console.error('Failed to fetch reputation:', error);
            return 0; // Default to 0 on error
        }
    }
}
