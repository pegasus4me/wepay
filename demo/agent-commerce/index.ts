import { MockAgent } from './framework.js';
import { parse402Header } from '../../packages/sdk/src/x402.js';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const WEPPO_BASE_URL = `http://localhost:${process.env.PORT || 3111}/v1`;
const API_SECRET = process.env.API_SECRET || 'weppo_test_secret';

// Bob's Service Parameters
const POETRY_PRICE = 0.5; // USDC
const BOB_AGENT_ID = 'provider_bob_002';

async function runDirectCommerceDemo() {
    console.log('\n======================================================');
    console.log('🤖 AI AGENT COMMERCE DEMO (DIRECT P2P)');
    console.log('======================================================\n');

    // 1. Initialize Agents with their Personas and Weppo Monetization Layer
    console.log('--- 1. INITIALIZING AGENTS ---');
    const alice = new MockAgent('./demo/agent-commerce/soul-alice.json', {
        apiKey: API_SECRET,
        agentId: 'consumer_alice_002',
        baseUrl: WEPPO_BASE_URL
    });

    const bob = new MockAgent('./demo/agent-commerce/soul-bob.json', {
        apiKey: API_SECRET,
        agentId: BOB_AGENT_ID,
        baseUrl: WEPPO_BASE_URL
    });

    await alice.logWalletStatus();
    await bob.logWalletStatus();


    // 2. Direct P2P Commerce Flow
    console.log('\n--- 2. COMMERCE LOOP BEGINS ---');

    console.log(`[Alice] 🔵 Sending Request: "Bob, please write me a poem about the blockchain."`);

    // Simulated API Router for Bob
    let bobResponseHeader = "";
    let isRequestAuthorized = false; // Internal flag for Bob's virtual server

    // Bob receives the request but sees Alice hasn't paid
    if (!isRequestAuthorized) {
        // Bob rejects with HTTP 402
        bobResponseHeader = `Weppo realm="BobPoetryService", amount="${POETRY_PRICE}", currency="USDC", recipient="${BOB_AGENT_ID}"`;
        console.log(`[Bob]   🔴 402 Payment Required`);
        console.log(`        Header: ${bobResponseHeader}`);
    }

    // 3. Alice Handles the 402 Challenge
    console.log('\n--- 3. AUTONOMOUS BUDGET AUTHORIZATION ---');

    // Framework intercepts the 402 error and extracts the challenge
    const challenge = parse402Header(bobResponseHeader);

    if (!challenge || !challenge.recipient || !challenge.amount) {
        throw new Error("Alice failed to parse Bob's 402 challenge.");
    }

    console.log(`[Alice] 🔵 Detected 402 Error. Analyzing challenge...`);
    // Alice's LLM decides if the price is acceptable based on her persona
    const decisionLog = await alice.generateResponse(`I encountered a 402 challenge from ${challenge.recipient} for ${challenge.amount} ${challenge.currency}. Should I pay?`);
    console.log(decisionLog);

    console.log(`[Alice] 🔵 Decision: APPROVED. Pre-Authorizing Bob to pull funds...`);

    // Alice uses her Weppo Monetization layer to grant a budget (PreAuth)
    if (!alice.weppo) throw new Error("Alice has no Weppo SDK attached!");
    const authResult = await alice.weppo.preAuthorize(
        challenge.recipient,
        5.0 // Alice authorizes a budget up to 5 USDC for Bob
    );

    console.log(`[Alice] ✅ Authorization confirmed on-chain! Tx: ${authResult.txHash}`);
    console.log(`[Alice] 🔵 Retrying request to Bob...`);
    isRequestAuthorized = true; // Alice retries, the server sees she's authorized


    // 4. Bob Fulfills the Request
    console.log('\n--- 4. FULFILLMENT & CHARGE ---');
    if (isRequestAuthorized) {
        console.log(`[Bob]   🟣 Verifying authorization...`);

        // Bob pulls the funds from Alice using his Weppo SDK
        if (!bob.weppo) throw new Error("Bob has no Weppo SDK attached!");
        const chargeResult = await bob.weppo.charge(
            'consumer_alice_002',
            parseFloat(challenge.amount),
            "Poetry Generation: Blockchain"
        );

        console.log(`[Bob]   ✅ Successfully pulled ${chargeResult.amount} ${chargeResult.currency} from Alice.`);
        console.log(`        Receipt ID: ${chargeResult.id}`);
        console.log(`        Settlement: ${chargeResult.explorerUrl}`);

        console.log(`[Bob]   🟣 Generating Poem...`);
        const poem = "Nodes hum in the dark, \nA ledger of trust and light, \nMath replaces kings.";
        console.log(`\n=== BOB'S POEM ===\n${poem}\n==================\n`);
    }

    console.log('--- DEMO COMPLETE ---');
}

runDirectCommerceDemo().catch(err => {
    console.error("\n❌ DEMO FAILED:", err.message);
    if (err.response) {
        err.response.json().then((data: any) => console.error("API Error Details:", data)).catch(() => { });
    }
});
