import { createPublicClient, http, encodeFunctionData, parseUnits, getAddress } from 'viem';
import { baseSepolia } from 'viem/chains';
import { CdpClient } from '@coinbase/cdp-sdk';
import { config } from '../config.js';
import db from '../db.js';

const USDC_ABI = [
    { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: 'success', type: 'bool' }] },
    { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'balance', type: 'uint256' }] }
];

const WEPPO_ABI = [
    { name: 'deposit', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
    { name: 'preAuthorize', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
    { name: 'allowances', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }, { name: '', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] }
];

async function run() {
    console.log("--- FUNDING AND PRE-AUTH DIAGNOSTICS FOR 'tom' ---");
    const agentId = 'tom';
    const { data: agent } = await db.from('agents').select('*').eq('id', agentId).maybeSingle();

    if (!agent) {
        console.error("Agent 'tom' not found in DB.");
        return;
    }

    const address = agent.wallet_address;
    console.log(`Address: ${address}`);

    const cdp = new CdpClient({
        apiKeyName: config.cdpApiKeyId,
        apiKeySecret: config.cdpApiKeySecret,
        walletSecret: config.cdpWalletSecret
    } as any);

    const publicClient = createPublicClient({ chain: baseSepolia, transport: http(config.rpcUrl) });

    // 1. Approve
    const amountToDeposit = parseUnits("1.0", 6);
    console.log("Step 1: Approving Weppo to spend USDC...");
    const approveData = encodeFunctionData({
        abi: USDC_ABI,
        functionName: 'approve',
        args: [config.weppoAddress, amountToDeposit],
    });
    const approveTx = await cdp.evm.sendTransaction({
        address,
        transaction: { to: config.usdcAddress, data: approveData, value: 0n },
        network: "base-sepolia"
    });
    console.log(`Approve Tx sent: ${approveTx.transactionHash}`);
    console.log("Waiting 10s for approval to settle...");
    await new Promise(r => setTimeout(r, 10000));

    // 2. Deposit
    console.log("Step 2: Depositing into Weppo Escrow...");
    const depositData = encodeFunctionData({
        abi: WEPPO_ABI,
        functionName: 'deposit',
        args: [amountToDeposit],
    });
    const depositTx = await cdp.evm.sendTransaction({
        address,
        transaction: { to: config.weppoAddress, data: depositData, value: 0n },
        network: "base-sepolia"
    });
    console.log(`Deposit Tx sent: ${depositTx.transactionHash}`);
    console.log("Waiting 10s for deposit to settle...");
    await new Promise(r => setTimeout(r, 10000));

    // 3. Pre-Authorize self
    console.log("Step 3: Pre-authorizing self (tom -> tom) for 1 USDC...");
    const preAuthData = encodeFunctionData({
        abi: WEPPO_ABI,
        functionName: 'preAuthorize',
        args: [address, amountToDeposit],
    });
    const preAuthTx = await cdp.evm.sendTransaction({
        address,
        transaction: { to: config.weppoAddress, data: preAuthData, value: 0n },
        network: "base-sepolia"
    });
    console.log(`PreAuth Tx sent: ${preAuthTx.transactionHash}`);

    console.log("\n✅ FINISHED! Agent 'tom' should now have 1.0 USDC balance and allowance for self.");
}

run().catch(console.error);
