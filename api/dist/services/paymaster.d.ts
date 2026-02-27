export interface GasUsage {
    gasLimit: bigint;
    gasPrice: bigint;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
}
export declare class PaymasterService {
    /**
     * Tracks and records the sponsorship of a transaction.
     */
    trackSponsorship(paymentId: string, gasUsed: bigint, gasPrice: bigint): Promise<void>;
    /**
     * Returns total sponsorship stats for an agent.
     */
    getAgentStats(agentId: string): Promise<{
        transactionCount: number;
        totalSponsorshipEth: string;
    }>;
}
