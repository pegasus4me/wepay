import { Weppo } from '../packages/sdk/src/index.js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Weppo Invoice Scenario
 * 
 * 1. Agent Alice (Consultant) creates an Invoice for "Strategy Session".
 * 2. Agent Bob (Client) pays the Invoice.
 */
async function runInvoiceDemo() {
    console.log('--- Weppo Invoice Demo ---');

    const PORT = process.env.PORT || 3114;
    const BASE_URL = `http://localhost:${PORT}/v1`;

    // --- 1. Agent Alice (The Consultant) ---
    const alice = new Weppo({
        apiKey: 'sk_alice_provider',
        agentId: 'agent_alice_consulting',
        baseUrl: BASE_URL
    });

    console.log('\n[Alice] Creating Invoice for 1 USDC...');
    const invoice = await alice.invoice.create({
        amount: 1,
        currency: 'USDC',
        description: 'Strategy Session - Feb 2026',
        payerId: 'agent_bob_client' // Optional: Restrict to Bob
    });

    console.log(`[Alice] Invoice Created!`);
    console.log(`ID: ${invoice.id}`);
    console.log(`Link: ${invoice.payLink}`);
    console.log(`Status: ${invoice.status}`);

    // --- 2. Agent Bob (The Client) ---
    const bob = new Weppo({
        apiKey: 'sk_bob_consumer',
        agentId: 'agent_bob_client',
        baseUrl: BASE_URL
    });

    console.log('\n[Bob] Paying Invoice...');

    // Bob pays the invoice. He doesn't need to know the amount or Alice's address.
    // It's all in the invoice.

    try {
        const receipt = await bob.pay({
            invoiceId: invoice.id
        });

        console.log('\n--- Payment Successful! ---');
        console.log(`Receipt ID: ${receipt.id}`);
        console.log(`Paid To: ${receipt.to}`);
        console.log(`Amount: ${receipt.amount} ${receipt.currency}`);

        // --- 3. Verify Invoice Status ---
        console.log('\n[Alice] Verifying status...');
        const updatedInvoice = await alice.invoice.get(invoice.id);
        console.log(`Status: ${updatedInvoice.status}`);
        console.log(`Hash: ${updatedInvoice.paymentHash}`);

    } catch (e: any) {
        console.error('Payment Failed:', e.message);
    }
}

runInvoiceDemo();
