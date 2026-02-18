import { Weppo } from '../packages/sdk/src/index.js';
import dotenv from 'dotenv';
import { parse402Header, formatWeppoAuth } from '../packages/sdk/src/x402.js';

dotenv.config();

// We simulate Two Agents:
// 1. "Consumer Agent" (Alice) - Has funds, wants to buy.
// 2. "Provider Agent" (Bob) - Sells a service, requires payment.

async function runDemo() {
    console.log('\n--- 🤖 Weppo x402 Settlement Demo ---\n');

    // --- SETUP: Initialize Agents ---

    // Alice (Consumer)
    const alice = new Weppo({
        apiKey: process.env.API_SECRET || 'weppo_test_secret',
        agentId: 'agent_alice_001',
        baseUrl: `http://localhost:${process.env.PORT || 3111}/v1`,
    });

    // Bob (Provider)
    const bob = new Weppo({
        apiKey: process.env.API_SECRET || 'weppo_test_secret',
        agentId: 'agent_bob_007',
        baseUrl: `http://localhost:${process.env.PORT || 3111}/v1`,
    });

    try {
        // 1. Bob defines his service price
        const SERVICE_COST = 1.50; // USDC
        console.log(`[Bob] Offering 'Search Service' for ${SERVICE_COST} USDC.`);

        // 2. Alice attempts to use the service (Simulated 402 Loop)
        console.log(`\n[Alice] 🔵 Requesting service from Bob...`);

        // Bob rejects with 402 (Simulated)
        const bobReplyHeader = `Weppo realm="BobService", amount="${SERVICE_COST}", currency="USDC", recipient="agent_bob_007"`;
        console.log(`[Bob] 🔴 402 Payment Required. Header: ${bobReplyHeader}`);

        // 3. Alice parses the 402 challenge
        const challenge = parse402Header(bobReplyHeader);
        if (!challenge) throw new Error('Failed to parse 402 header');

        console.log(`[Alice] Parsing challenge... Amount: ${challenge.amount}, Recipient: ${challenge.recipient}`);

        // 4. Alice Pre-Authorizes Bob (The "Pull" Permission)
        // In a real optimized flow, this might happen once per session or budget period.
        console.log(`\n[Alice] 🔵 Pre-Authorizing Bob to pull funds...`);
        const authResult = await alice.preAuthorize({
            spender: challenge.recipient!,
            maxAmount: 10.0, // Authorize a budget of 10 USDC
        });
        console.log(`[Alice] ✅ Authorization confirmed on-chain. TX: ${authResult.txHash}`);

        // 5. Bob Charges Alice (The "Pull" Execution)
        console.log(`\n[Bob] 🟣 Charging Alice ${challenge.amount} USDC...`);
        const payment = await bob.charge({
            from: 'agent_alice_001',
            amount: challenge.amount!,
            currency: challenge.currency,
            memo: 'Search Service Query #5521'
        });

        console.log(`[Bob] ✅ Payment Secured!`);
        console.log(`       ID: ${payment.id}`);
        console.log(`       Settlement: ${payment.explorerUrl}`);

        // 6. Alice confirms service usage
        console.log(`\n[Alice] 🔵 Service consumed successfully.`);

    } catch (error: any) {
        console.error('\n❌ Demo Failed:', error.message);
        if (error.response) console.error('API Error:', await error.response.json());
    }
}

runDemo();
