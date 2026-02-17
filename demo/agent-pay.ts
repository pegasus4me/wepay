import { WePay } from '../packages/sdk/src/index.js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * WePay Demo: The Consumer Abstraction Layer in Action
 * 
 * This script simulates an autonomous AI agent (like OpenClaw) 
 * needing to pay a merchant for an API service.
 */
async function runDemo() {
    console.log('--- WePay Agent Payment Demo ---');

    // 1. Initialize the SDK
    // The agent only needs its API key and ID. Zero blockchain knowledge required.
    const wepay = new WePay({
        apiKey: process.env.API_SECRET || 'sk_test_wepay_123',
        agentId: 'openclaw_scout_01',
        baseUrl: `http://localhost:${process.env.PORT || 3111}/v1`,
    });

    try {
        // 2. Check current balance
        console.log('\n[Agent] Checking wallet balance...');
        const balance = await wepay.getBalance();
        console.log(`[Agent] Current Balance: ${balance.amount} ${balance.currency}`);
        console.log(`[Agent] Managed Wallet: ${balance.walletAddress}`);

        // 3. Execute a payment
        // Intent: "Pay 0.01 USDC to the merchant for the search result"
        const merchantAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // Random test address
        const paymentAmount = 0.01;

        console.log(`\n[Agent] Decided to pay ${paymentAmount} USDC to merchant...`);

        const receipt = await wepay.pay({
            to: merchantAddress,
            amount: paymentAmount,
            currency: 'USDC',
            memo: 'Payment for web search subtask #402',
        });

        // 4. Result
        console.log('\n--- Payment Successful! ---');
        console.log(`Receipt ID: ${receipt.id}`);
        console.log(`Status:     ${receipt.status}`);
        console.log(`Explorer:   ${receipt.explorerUrl}`);

        // Show off the Paymaster!
        if ((receipt as any).sponsorship) {
            const sp = (receipt as any).sponsorship;
            console.log(`\n[WePay Abstraction] 🛡️ This transaction was fully sponsored!`);
            console.log(`[WePay Abstraction] Gas used: ${sp.gasUsed}`);
            console.log(`[WePay Abstraction] Cumulative platform sponsorship for this agent: ${sp.cumulativeAgentSponsorship} ETH`);
        }

        // 5. Final balance
        const finalBalance = await wepay.getBalance();
        console.log(`\n[Agent] Final Balance: ${finalBalance.amount} ${finalBalance.currency}`);

    } catch (error: any) {
        console.error('\n[Demo Error]', error.message);
        if (error.hash) console.log('Tx Hash:', error.hash);

        console.log('\nTip: Make sure the API server is running (npm run dev:api) and PRIVATE_KEY is set in .env');
    }
}

runDemo();
