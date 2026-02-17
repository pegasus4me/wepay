import { Weppo } from '../packages/sdk/src/index.js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Weppo Market Scenario
 * 
 * 1. Agent Alice (Provider) registers a "Translation Service".
 * 2. Agent Bob (Consumer) searches for "Translation".
 * 3. Agent Bob pays Alice for the service.
 */
async function runMarketDemo() {
    console.log('--- Weppo Agent Market Demo ---');

    const PORT = process.env.PORT || 3114; // Use the new port we spun up
    const BASE_URL = `http://localhost:${PORT}/v1`;

    // --- 1. Agent Alice (The Provider) ---
    const alice = new Weppo({
        apiKey: 'sk_alice_provider',
        agentId: 'agent_alice_translatr',
        baseUrl: BASE_URL
    });

    console.log('\n[Alice] Listing "English to Binary" service...');
    const service = await alice.market.list({
        name: 'English to Binary',
        description: 'I translate any text to 0s and 1s.',
        price: 0.05,
        currency: 'USDC',
        endpointUrl: 'https://alice.agents/api/translate'
    });

    console.log(`[Alice] Service Listed! ID: ${service.id}`);
    console.log(`[Alice] Price: ${service.price} ${service.currency}`);

    // --- 2. Agent Bob (The Consumer) ---
    const bob = new Weppo({
        apiKey: 'sk_bob_consumer',
        agentId: 'agent_bob_builder',
        baseUrl: BASE_URL
    });

    console.log('\n[Bob] Searching for services...');
    const services = await bob.market.find();
    const targetService = services.find(s => s.id === service.id);

    if (!targetService) {
        console.error('[Bob] Could not find the service!');
        return;
    }

    console.log(`[Bob] Found service: "${targetService.name}" by ${targetService.providerAgentId}`);

    // --- 3. Bob Pays Alice ---
    // Note: In a real scenario, Bob would get Alice's wallet from the registry or the SDK would handle it.
    // For now, we might need to resolve it. 
    // Let's assume the Registry returns the wallet address? 
    // functionality-check: Does Service interface have walletAddress? No.
    // But the API knows Alice's wallet.

    // We send the payment to the Agent ID? Or does the payment endpoint support Agent IDs?
    // Let's rely on the PaymentService resolving logic we are about to add.

    console.log(`[Bob] Paying ${targetService.price} USDC for service...`);

    // We'll pass the service.id. The API should look up the provider and pay them.
    // DOES IT? We need to implement that in PaymentService.

    /* 
       Optimistic Code: Assuming we update PaymentService to accept `serviceId` 
       and resolve the recipient automatically.
    */

    const receipt = await bob.pay({
        to: targetService.providerAgentId, // or maybe just passing serviceId is enough?
        amount: targetService.price,
        currency: targetService.currency,
        productId: targetService.id, // x402 mapping
        memo: 'Translating "Hello World"'
    });

    console.log('\n--- Payment Successful! ---');
    console.log(`Receipt ID: ${receipt.id}`);
    console.log(`To: ${receipt.to}`);
    console.log(`Status: ${receipt.status}`);
}

runMarketDemo();
