import express from 'express';
import { Weppo, weppoPaymentMiddleware } from '../packages/sdk/src/index.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../api/.env') });

async function runDynamicDemo() {
    console.log("==================================================");
    console.log("    Weppo x402 Dynamic Monetization Demo          ");
    console.log("==================================================");

    const API_BASE = "http://localhost:3111/v1";

    // 1. Setup Seller (Bob)
    const bob = new Weppo({
        agentId: "bob_seller",
        apiKey: "bob_api_key", // In real world, this would be a valid key
        baseUrl: API_BASE
    });

    const app = express();
    app.use(express.json());

    // Monetized Endpoint for Bob
    app.post('/api/market-research', 
        weppoPaymentMiddleware({
            client: (bob as any).client,
            price: async (req) => {
                // Dynamic lookup: In a real app, this queries the Weppo API/DB
                // For this demo, we simulate a hit to Bob's research path
                console.log(`[Bob's Server] Checking price for ${req.path}...`);
                return 0.75; 
            },
            memo: "Market Research Data Feed"
        }),
        (req, res) => {
            console.log("[Bob's Server] Payment verified! Serving data...");
            res.json({
                status: "success",
                data: "Base network is growing at 20% MoM. Recommendation: Accumulate USDC."
            });
        }
    );

    const server = app.listen(4002, () => {
        console.log("🚀 Bob's Monetized Agent Service running on http://localhost:4002");
    });

    // 2. Setup Buyer (Alice)
    console.log("
[Alice] Initializing Buyer Agent...");
    const alice = new Weppo({
        agentId: "alice_buyer",
        apiKey: "alice_api_key",
        baseUrl: API_BASE
    });

    // Simulate Alice having a pre-authorization for Bob
    console.log("[Alice] Note: Alice must have pre-authorized Bob on Weppo for this to work gaslessly.");

    try {
        console.log("
[Alice] Attempting to access Bob's research via x402Fetch...");
        
        // This single call handles:
        // 1. Initial request
        // 2. Receiving 402 challenge
        // 3. Auto-settling the "Pull" charge via Weppo
        // 4. Retrying and getting the data
        const response = await alice.x402Fetch("http://localhost:4002/api/market-research", {
            method: "POST"
        });

        const result = await response.json();
        console.log("
[Alice] Received Data from Bob:");
        console.log(JSON.stringify(result, null, 2));

    } catch (error: any) {
        console.error("
[Demo Error]", error.message);
    } finally {
        console.log("
Cleaning up...");
        server.close();
        process.exit(0);
    }
}

runDynamicDemo();
