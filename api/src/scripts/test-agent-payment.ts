import { CdpClient } from '@coinbase/cdp-sdk';
import { config } from '../config.js';
import db from '../db.js';

async function testPayment() {
    try {
        console.log("Looking up agent wallet...");
        const agentId = "agent_server_wallet_test_2";
        const apiKey = "weppo_key_7cfb9b0b8f5edb3260158dd073143bdb336be6f4cb14e628";

        const row = db.prepare('SELECT wallet_address FROM agents WHERE id = ?').get(agentId) as { wallet_address: string };
        const walletAddress = row.wallet_address;
        console.log("Found wallet:", walletAddress);

        console.log("Funding agent wallet via CDP Faucet...");
        const cdp = new CdpClient({
            apiKeyName: config.cdpApiKeyId,
            apiKeySecret: config.cdpApiKeySecret,
            walletSecret: config.cdpWalletSecret
        } as any);

        const ethFaucetTx = await cdp.evm.requestFaucet({
            address: walletAddress,
            network: "base-sepolia",
            token: "eth"
        });
        console.log(`Requested ETH! TxHash: ${ethFaucetTx.transactionHash}`);

        const usdcFaucetTx = await cdp.evm.requestFaucet({
            address: walletAddress,
            network: "base-sepolia",
            token: "usdc"
        });
        console.log(`Requested USDC! TxHash: ${usdcFaucetTx.transactionHash}`);

        // Wait for 10 seconds to allow faucet to settle
        console.log("Waiting 15 seconds for faucet settlement...");
        await new Promise(r => setTimeout(r, 15000));

        console.log("Triggering Weppo API Transfer...");
        const res = await fetch("http://localhost:3111/v1/payments", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                recipient: "0x3c0D84055994c3062819Ce8730869D0aDeA4c3Bf", // Valid non-zero address
                amount: 0.1,
                memo: "Test CDP Transfer SDK"
            })
        });

        const data = await res.json();
        console.log("API Response:", data);

    } catch (e: any) {
        console.error("Test Failed", e);
    }
}

testPayment();
