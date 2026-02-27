import { MockAgent } from './framework.js';
import { CdpClient } from '@coinbase/cdp-sdk';
import dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import db from '../../api/src/db.js';
import {
    createPublicClient,
    createWalletClient,
    http,
    parseEther,
    parseUnits,
    formatEther,
    formatUnits,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../api/.env') });

const API_BASE_URL = 'http://localhost:3111/v1';
const AUTH_URL = 'http://localhost:3111/auth/keys';
const USDC_ADDRESS = process.env.USDC_CONTRACT_ADDRESS as `0x${string}`;
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function registerAgent(agentId: string, label: string) {
    console.log(`[System] Registering ${agentId}...`);
    const res = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, label, customKey: agentId }),
    });
    if (!res.ok) throw new Error(`Registration failed: ${await res.text()}`);
    return res.json() as Promise<{ apiKey: string; agentId: string }>;
}

async function fundAgent(walletAddress: string, name: string) {
    const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });

    const ethBal = await publicClient.getBalance({ address: walletAddress as `0x${string}` });
    const usdcBal = (await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: [{ name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'balance', type: 'uint256' }] }],
        functionName: 'balanceOf',
        args: [walletAddress as `0x${string}`],
    })) as bigint;

    console.log(`[System] ${name} on-chain: ${formatEther(ethBal)} ETH, ${formatUnits(usdcBal, 6)} USDC`);

    // Only fund if low
    const needsEth = ethBal < parseEther('0.002');
    // Alice needs 0.1+ for deposit, Bob just needs ETH for gas
    const minUsdc = name.toLowerCase().includes('alice') ? parseUnits('0.1', 6) : parseUnits('0.01', 6);
    const needsUsdc = usdcBal < minUsdc;

    if (!needsEth && !needsUsdc) {
        console.log(`[System] ${name} has sufficient funds. ✓`);
        return;
    }

    // Try CDP faucet first
    const cdp = new CdpClient({
        apiKeyName: process.env.CDP_API_KEY_ID,
        apiKeySecret: process.env.CDP_API_KEY_SECRET,
        walletSecret: process.env.CDP_WALLET_SECRET,
    } as any);

    let faucetUsed = false;
    try {
        if (needsEth) await cdp.evm.requestFaucet({ address: walletAddress, network: 'base-sepolia', token: 'eth' });
        if (needsUsdc) await cdp.evm.requestFaucet({ address: walletAddress, network: 'base-sepolia', token: 'usdc' });
        console.log(`[System] Faucet requests submitted for ${name}.`);
        faucetUsed = true;
    } catch (e: any) {
        console.warn(`[System] Faucet skipped: ${e.message}`);
    }

    if (!faucetUsed && process.env.PRIVATE_KEY) {
        const serverAccount = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
        const walletClient = createWalletClient({ account: serverAccount, chain: baseSepolia, transport: http(RPC_URL) });

        if (needsEth) {
            const nonce = await publicClient.getTransactionCount({ address: serverAccount.address, blockTag: 'pending' });
            console.log(`[System] Sending ETH to ${name} (nonce=${nonce})...`);
            const h = await walletClient.sendTransaction({ to: walletAddress as `0x${string}`, value: parseEther('0.006'), nonce });
            await publicClient.waitForTransactionReceipt({ hash: h });
            await new Promise(r => setTimeout(r, 8000)); // nonce cooldown
        }

        if (needsUsdc) {
            const usdcAmount = name.toLowerCase().includes('alice') ? '0.1' : '0.05';
            const nonce2 = await publicClient.getTransactionCount({ address: serverAccount.address, blockTag: 'pending' });
            console.log(`[System] Sending ${usdcAmount} USDC to ${name} (nonce=${nonce2})...`);
            try {
                const h = await walletClient.writeContract({
                    address: USDC_ADDRESS,
                    abi: [{ name: 'transfer', type: 'function', inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ name: 'success', type: 'bool' }] }],
                    functionName: 'transfer',
                    args: [walletAddress as `0x${string}`, parseUnits(usdcAmount, 6)],
                    nonce: nonce2,
                });
                await publicClient.waitForTransactionReceipt({ hash: h });
                console.log(`[System] Server wallet funding complete for ${name}.`);
            } catch (e: any) {
                console.warn(`[System] Server wallet USDC funding failed: ${e.message}. Moving on...`);
            }
        }
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function runDemo() {
    console.log('==================================================');
    console.log('    Alice & Bob: Autonomous AI Commerce Demo      ');
    console.log('==================================================');

    try {
        // ── 1. Registration ────────────────────────────────────────────────────
        const aliceData = await registerAgent('alice_demo_v4', 'Alice the Consumer');
        const { data: aliceRow } = await db.from('agents').select('wallet_address').eq('id', aliceData.agentId).maybeSingle();
        const aliceWallet = aliceRow!.wallet_address;
        await fundAgent(aliceWallet, 'Alice');

        const alice = new MockAgent({
            name: 'Alice',
            agentId: aliceData.agentId,
            apiKey: aliceData.apiKey,
            soulPath: path.join(__dirname, 'soul-alice.md'),
            baseUrl: API_BASE_URL,
        });

        const bobData = await registerAgent('bob_demo_v4', 'Bob the Poet');
        const { data: bobRow } = await db.from('agents').select('wallet_address').eq('id', bobData.agentId).maybeSingle();
        const bobWallet = bobRow!.wallet_address;
        await fundAgent(bobWallet, 'Bob');

        const bob = new MockAgent({
            name: 'Bob',
            agentId: bobData.agentId,
            apiKey: bobData.apiKey,
            soulPath: path.join(__dirname, 'soul-bob.md'),
            baseUrl: API_BASE_URL,
        });

        // ── 2. Deposit into Weppo Escrow ───────────────────────────────────────
        // balances[alice] must be > 0 on-chain for Bob's charge call to succeed.
        console.log(`\n[Alice] Checking Weppo Escrow balance...`);
        const balance = await alice.weppo.getBalance();
        console.log(`[Alice] Escrow Balance: ${balance.amount} ${balance.currency}`);

        if (balance.amount < 0.01) {
            console.log('[Alice] 🏦 Depositing 0.1 USDC into Weppo Escrow...');
            await alice.weppo.deposit(0.1);
            console.log('[Alice] ✅ Weppo deposit confirmed.');
        } else {
            console.log('[Alice] ✅ Sufficient Escrow balance. Skipping deposit.');
        }

        // ── 3. Commerce Simulation ─────────────────────────────────────────────
        console.log('\n--- Simulation Start ---');
        const result = await alice.callService(bob, '/poetry');

        console.log('\n--- ✅ Simulation Complete ---');
        console.log('[Alice] Received Poetry from Bob:');
        console.log(`"${result.poem}"`);
        console.log(`[Receipt] ${result.receipt}`);
    } catch (error: any) {
        console.error('\n[Demo Error]', error);
    }
}

runDemo();
