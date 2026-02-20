import { CdpClient } from '@coinbase/cdp-sdk';
import { Weppo } from '@weppo/sdk';
import { config } from '../config.js';
import db from '../db.js';

async function runE2E() {
    console.log("==================================================");
    console.log("    Weppo API E2E Flow Test (Server Wallets)      ");
    console.log("==================================================");

    const uniqueId = `agent_e2e_${Date.now()}`;
    console.log(`\n[1] Registering New Agent: ${uniqueId}`);

    const authRes = await fetch("http://localhost:3111/auth/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: uniqueId, label: "E2E Test Agent" })
    });

    if (!authRes.ok) {
        throw new Error(`Failed to register agent: ${await authRes.text()}`);
    }

    const { apiKey, agentId } = await authRes.json() as any;
    console.log(`✅ Agent Registered! API Key: ${apiKey}`);

    console.log(`\n[2] Looking up provisioned Server Wallet...`);
    const agentRow = db.prepare('SELECT wallet_address FROM agents WHERE id = ?').get(agentId) as { wallet_address: string };
    const walletAddress = agentRow.wallet_address;
    console.log(`✅ Server Wallet Provisioned: ${walletAddress}`);

    console.log(`\n[3] Funding Wallet via CDP Faucets...`);
    const cdp = new CdpClient({
        apiKeyName: config.cdpApiKeyId,
        apiKeySecret: config.cdpApiKeySecret,
        walletSecret: config.cdpWalletSecret
    } as any);

    console.log("Requesting ETH for Gas...");
    const ethTx = await cdp.evm.requestFaucet({ address: walletAddress, network: "base-sepolia", token: "eth" });
    console.log(`✅ ETH Requested: ${ethTx.transactionHash}`);

    console.log("Requesting USDC for Payment...");
    const usdcTx = await cdp.evm.requestFaucet({ address: walletAddress, network: "base-sepolia", token: "usdc" });
    console.log(`✅ USDC Requested: ${usdcTx.transactionHash}`);

    console.log("\n[4] Waiting 20 seconds for faucet funds to settle on-chain...");
    await new Promise(r => setTimeout(r, 20000));

    console.log(`\n[5] Executing Weppo SDK Payment...`);
    const weppo = new Weppo({
        apiKey: apiKey,
        agentId: agentId,
        baseUrl: "http://localhost:3111/v1"
    });

    const payData = await weppo.pay({
        recipient: "0x3c0D84055994c3062819Ce8730869D0aDeA4c3Bf",
        amount: 0.1,
        memo: "E2E SDK Automated Test"
    });

    console.log(`✅ Payment Successful!`);
    console.log(`   Transaction Hash: ${payData.hash}`);
    console.log(`   Gas Used: ${payData.gasUsed}`);
    console.log(`   Effective Gas Price: ${payData.effectiveGasPrice}`);
    console.log("\n🚀 End-to-End Flow Completed Successfully!");
}

runE2E().catch(console.error);
