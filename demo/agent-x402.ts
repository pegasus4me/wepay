import { Weppo } from '../packages/sdk/src/index.js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Weppo x402 Demo: The Merchant Gateway in Action
 * 
 * This script simulates an agent programmatically "discovering" a product 
 * and paying for it using the x402 Merchant Gateway pattern.
 */
async function runX402Demo() {
    console.log('--- Weppo x402 Merchant Gateway Demo ---');

    const weppo = new Weppo({
        apiKey: process.env.API_SECRET || 'sk_test_weppo_123',
        agentId: 'openclaw_scout_01',
        baseUrl: `http://localhost:${process.env.PORT || 3111}/v1`,
    });

    try {
        const gatewayAddress = process.env.MERCHANT_GATEWAY_ADDRESS || '0xEF822A6b8960041C069800F6dd9D4E370f2C9047';
        const productId = '102'; // Numeric ID for contract compatibility

        // 1. Discovery (Simulated)
        console.log(`\n[Agent] Programmatically discovered product: ${productId} at gateway ${gatewayAddress}`);

        // 2. Intent: "I need simple search for my task. Contract says it's 0.01 USDC."
        const paymentAmount = 0.01;

        console.log(`[Agent] Initiating x402 purchase for ${paymentAmount} USDC...`);

        const receipt = await weppo.pay({
            to: gatewayAddress,
            amount: paymentAmount,
            productId: productId,
            memo: 'Unstructured web search access for sub-agent swarm #88',
        });

        // 3. Result
        console.log('\n--- x402 Purchase Successful! ---');
        console.log(`Receipt ID:  ${receipt.id}`);
        console.log(`Product ID:  ${(receipt as any).productId}`);
        console.log(`Settlement:  Confirmed on-chain`);
        console.log(`Explorer:    ${receipt.explorerUrl}`);

        if ((receipt as any).sponsorship) {
            console.log(`\n[Weppo Abstraction] 🛡️ Gas was fully sponsored by the Paymaster Engine.`);
            console.log(`[Weppo Abstraction] Cumulative sponsorship: ${(receipt as any).sponsorship.cumulativeAgentSponsorship} ETH`);
        }

    } catch (error: any) {
        console.error('\n[x402 Demo Error]', error.message);
        console.log('\nTip: Make sure the API server is running (npm run dev:api)');
    }
}

runX402Demo();
