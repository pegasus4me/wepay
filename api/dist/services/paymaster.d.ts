export interface GasUsage {
    gasLimit: bigint;
    gasPrice: bigint;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
}
export declare class PaymasterService {
    /**
     * Tracks and records the sponsorship of a transaction.
     * In a real system, this would also check against spend rules or quotas.
     */
    trackSponsorship(paymentId: string, gasUsed: bigint, gasPrice: bigint): Promise<void>;
    /**
     * Returns total sponsorship stats for an agent.
     */
    getAgentStats(agentId: string): {
        transactionCount: any;
        totalSponsorshipEth: string;
    };
}
