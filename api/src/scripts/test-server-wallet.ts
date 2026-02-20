import { CdpClient } from '@coinbase/cdp-sdk';
import { config } from '../config.js';

async function test() {
    try {
        console.log("Configuring CDP Client...");
        const cdp = new CdpClient({
            apiKeyName: config.cdpApiKeyId,
            apiKeySecret: config.cdpApiKeySecret,
            walletSecret: config.cdpWalletSecret
        } as any);

        console.log("Creating EVM Account...");
        const account = await cdp.evm.createAccount();
        console.log("Account created:", account.address);

        console.log("Requesting Base Sepolia ETH from faucet...");
        const faucetResponse = await cdp.evm.requestFaucet({
            address: account.address,
            network: "base-sepolia",
            token: "eth"
        });

        console.log(`Requested ETH! TxHash: ${faucetResponse.transactionHash}`);

    } catch (err: any) {
        console.error("Error creating or funding account!");
        console.error(err);
        if (err.response) {
            console.error(err.response.data);
        }
    }
}

test();
