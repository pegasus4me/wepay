import { createPublicClient, http, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { createClient } from '@supabase/supabase-js';

// Get credentials from env
const WEPPO_ADDRESS = "0x82D9828fdCAD4082721932201d10AF4446bBd0f9"; // from .env
const SUPABASE_URL = "https://agicdlsgcaassxjqhawo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnaWNkbHNnY2Fhc3N4anFoYXdvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTkzMSwiZXhwIjoyMDc4OTc1OTMxfQ.-sXsn-MgcRAP7zlBRwXT6miASApANyEZRCi3of8Ir4s";

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const WEPPO_ABI = [
    { name: 'balances', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
    { name: 'allowances', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }, { name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] }
];

async function main() {
    console.log("Checking DB for agent 'tom'...");
    const { data: agent, error } = await db.from('agents').select('*').eq('id', 'tom').single();

    if (error || !agent) {
        console.error("Agent 'tom' not found in DB", error);
        return;
    }

    console.log("Checking blockchain state for address:", agent.wallet_address);
    const client = createPublicClient({ chain: baseSepolia, transport: http() });

    try {
        const balance = await client.readContract({
            address: WEPPO_ADDRESS as any,
            abi: WEPPO_ABI,
            functionName: 'balances',
            args: [agent.wallet_address as any]
        }) as bigint;

        const allowance = await client.readContract({
            address: WEPPO_ADDRESS as any,
            abi: WEPPO_ABI,
            functionName: 'allowances',
            args: [agent.wallet_address as any, agent.wallet_address as any]
        }) as bigint;

        console.log("\n--- STATE DIAGNOSTICS FOR 'tom' ---");
        console.log("Address:", agent.wallet_address);
        console.log("Escrow Balance:", formatUnits(balance, 6), "USDC");
        console.log("Allowance (tom -> tom):", formatUnits(allowance, 6), "USDC");
        console.log("----------------------------------");

        if (balance < 500000n) console.log("⚠️ ERROR: Balance is too low to pay 0.50 USDC.");
        if (allowance < 500000n) console.log("⚠️ ERROR: Allowance is too low to authorize 0.50 USDC.");

    } catch (e) {
        console.error("RPC Error:", e);
    }
}

main();
