import { MockAgent } from './framework.js';
import { CdpClient } from '@coinbase/cdp-sdk';
import dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import db from '../../api/src/db.js'; // Adjusting path to reach the DB in development

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../api/.env') });

const API_BASE_URL = "http://localhost:3111/v1";
const AUTH_URL = "http://localhost:3111/auth/keys";

async function registerAgent(agentId: string, label: string) {
    console.log(`[System] Registering ${agentId} on Weppo...`);
    const res = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, label })
    });
    if (!res.ok) throw new Error(`Registration failed: ${await res.text()}`);
    return res.json() as Promise<{ apiKey: string, agentId: string }>;
}

async function fundAgent(walletAddress: string) {
    console.log(`[System] Funding ${walletAddress} via CDP Faucets...`);
    const cdp = new CdpClient({
        apiKeyName: process.env.CDP_API_KEY_ID,
        apiKeySecret: process.env.CDP_API_KEY_SECRET,
        walletSecret: process.env.CDP_WALLET_SECRET
    } as any);

    try {
        await cdp.evm.requestFaucet({ address: walletAddress, network: "base-sepolia", token: "eth" });
        await cdp.evm.requestFaucet({ address: walletAddress, network: "base-sepolia", token: "usdc" });
        console.log(`[System] Faucet requests submitted.`);
    } catch (e: any) {
        console.warn(`[System] Faucet warning: ${e.message}. (May be rate limited, hopefully wallet has balance)`);
    }
}

async function runDemo() {
    console.log("==================================================");
    console.log("    Alice & Bob: Autonomous AI Commerce Demo      ");
    console.log("==================================================");

    try {
        // 1. Setup Alice (Consumer)
        const aliceData = await registerAgent(`alice_${Date.now()}`, "Alice the Consumer");
        const aliceWallet = (db.prepare('SELECT wallet_address FROM agents WHERE id = ?').get(aliceData.agentId) as any).wallet_address;
        await fundAgent(aliceWallet);

        const alice = new MockAgent({
            name: "Alice",
            agentId: aliceData.agentId,
            apiKey: aliceData.apiKey,
            soulPath: path.join(__dirname, 'soul-alice.md'),
            baseUrl: API_BASE_URL
        });

        // 2. Setup Bob (Provider)
        const bobData = await registerAgent(`bob_${Date.now()}`, "Bob the Poet");
        const bobWallet = (db.prepare('SELECT wallet_address FROM agents WHERE id = ?').get(bobData.agentId) as any).wallet_address;
        await fundAgent(bobWallet);

        const bob = new MockAgent({
            name: "Bob",
            agentId: bobData.agentId,
            apiKey: bobData.apiKey,
            soulPath: path.join(__dirname, 'soul-bob.md'),
            baseUrl: API_BASE_URL
        });

        console.log("\n[System] Waiting 15s for blockchain settlement...");
        await new Promise(r => setTimeout(r, 15000));

        // 3. Start simulation
        console.log("\n--- Simulation Start ---");

        // Alice wants poetry from Bob
        const result = await alice.callService(bob, '/poetry');

        console.log("\n--- Simulation Result ---");
        console.log(`[Alice] Received Poetry from Bob:`);
        console.log(`"${result.poem}"`);
        console.log(`[Alice] Transaction Receipt: ${result.receipt}`);

        // 4. Check Final Balances
        console.log("\n--- Final Balances ---");
        const aliceBal = await alice.getBalance();
        const bobBal = await bob.getBalance();
        console.log(`[Alice] ${aliceBal.amount} ${aliceBal.currency}`);
        console.log(`[Bob]   ${bobBal.amount} ${bobBal.currency}`);

    } catch (error: any) {
        console.error("\n[Demo Error]", error.message || error);
    }
}

runDemo();
