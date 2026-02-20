import { CdpClient } from '@coinbase/cdp-sdk';
import { Weppo } from '@weppo/sdk';
import { config } from '../config.js';
import db from '../db.js';

async function runX402E2E() {
    console.log("==================================================");
    console.log("    Weppo API E2E x402 Flow Test (Server Wallets) ");
    console.log("==================================================");

    // --- START BYPASS FOR FAUCET RATE LIMITS ---
    // Injecting a previously registered and funded agent (agent_e2e_1771604604453)
    const agentId = "agent_e2e_1771604604453";
    const apiKey = "weppo_key_accf4edef43fdbfa799f9c998fd6d31dbb6e3fb8db273748";
    const walletAddress = "0xFa3863ea0F374ea0E88b2E752ad83B081fa86c85";

    console.log(`✅ Using Pre-Funded Agent: ${agentId}`);
    console.log(`✅ Pre-Funded Wallet: ${walletAddress}`);
    // --- END BYPASS ---

    console.log(`\n[5] Executing Weppo SDK x402 Purchase...`);
    const weppo = new Weppo({
        apiKey: apiKey,
        agentId: agentId,
        baseUrl: "http://localhost:3111/v1"
    });

    // The Weppo SDK supports sending `productId` through the generic `pay()` interface
    // which the API parses as an x402 Intent and routes to executePurchase()
    const payData = await weppo.pay({
        to: "0xEF822A6b8960041C069800F6dd9D4E370f2C9047",
        amount: 0.1,
        memo: "E2E SDK x402 API Test",
        productId: "1234"
    } as any);

    console.log(`✅ x402 Payment Successful!`);
    console.log(`   Transaction Hash: ${payData.hash}`);
    console.log(`   Gas Used: ${payData.gasUsed}`);
    console.log(`   Effective Gas Price: ${payData.effectiveGasPrice}`);
    console.log("\n🚀 End-to-End x402 Flow Completed Successfully!");
}

runX402E2E().catch(console.error);
