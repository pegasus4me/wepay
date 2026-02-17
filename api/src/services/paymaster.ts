import { formatEther } from 'viem';
import db from '../db.js';

export interface GasUsage {
    gasLimit: bigint;
    gasPrice: bigint;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
}

export class PaymasterService {
    /**
     * Tracks and records the sponsorship of a transaction.
     * In a real system, this would also check against spend rules or quotas.
     */
    async trackSponsorship(paymentId: string, gasUsed: bigint, gasPrice: bigint) {
        const totalCostEth = formatEther(gasUsed * gasPrice);

        console.log(`[Paymaster] Sponsoring payment ${paymentId}. Cost: ${totalCostEth} ETH`);

        db.prepare(`
      UPDATE payments 
      SET gas_used = ?, gas_price = ? 
      WHERE id = ?
    `).run(gasUsed.toString(), gasPrice.toString(), paymentId);
    }

    /**
     * Returns total sponsorship stats for an agent.
     */
    getAgentStats(agentId: string) {
        const stats = db.prepare(`
      SELECT 
        COUNT(*) as tx_count,
        SUM(CAST(gas_used AS REAL) * CAST(gas_price AS REAL)) as total_gas_wei
      FROM payments 
      WHERE agent_id = ? AND gas_used IS NOT NULL
    `).get(agentId) as any;

        return {
            transactionCount: stats?.tx_count || 0,
            totalSponsorshipEth: stats?.total_gas_wei ? formatEther(BigInt(Math.floor(stats.total_gas_wei))) : '0',
        };
    }
}
