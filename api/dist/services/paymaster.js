import { formatEther } from 'viem';
import db from '../db.js';
export class PaymasterService {
    /**
     * Tracks and records the sponsorship of a transaction.
     */
    async trackSponsorship(paymentId, gasUsed, gasPrice) {
        const totalCostEth = formatEther(gasUsed * gasPrice);
        console.log(`[Paymaster] Sponsoring payment ${paymentId}. Cost: ${totalCostEth} ETH`);
        await db.from('payments')
            .update({ gas_used: gasUsed.toString(), gas_price: gasPrice.toString() })
            .eq('id', paymentId);
    }
    /**
     * Returns total sponsorship stats for an agent.
     */
    async getAgentStats(agentId) {
        const { data } = await db
            .from('payments')
            .select('gas_used, gas_price')
            .eq('agent_id', agentId)
            .not('gas_used', 'is', null);
        const rows = data || [];
        const totalGasWei = rows.reduce((sum, r) => {
            if (r.gas_used && r.gas_price) {
                return sum + BigInt(r.gas_used) * BigInt(r.gas_price);
            }
            return sum;
        }, 0n);
        return {
            transactionCount: rows.length,
            totalSponsorshipEth: totalGasWei > 0n ? formatEther(totalGasWei) : '0',
        };
    }
}
