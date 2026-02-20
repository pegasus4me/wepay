import { CdpClient } from '@coinbase/cdp-sdk';
import { config } from '../config.js';
import { encodeFunctionData, parseUnits } from 'viem';

const USDC_ABI = [{ name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'recipient', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: 'success', type: 'bool' }] }] as const;

async function test() {
    const cdp = new CdpClient({ apiKeyName: config.cdpApiKeyId, apiKeySecret: config.cdpApiKeySecret, walletSecret: config.cdpWalletSecret } as any);
    const address = "0xE1C1279Fb9160634aaFBc35eDa9c30a8Ba8c1137";
    const data = encodeFunctionData({ abi: USDC_ABI, functionName: 'transfer', args: ["0x0000000000000000000000000000000000000000", parseUnits("0.1", 6)] });

    try {
        console.log("Sending...", {
            to: config.usdcAddress,
            data: data,
            value: BigInt(0),
        });
        const response = await cdp.evm.sendTransaction({
            address,
            transaction: {
                to: config.usdcAddress,
                data: data,
                value: BigInt(0),
            },
            network: "base-sepolia"
        });
        console.log("TxHash:", response.transactionHash);
    } catch (e: any) {
        console.error("Failed:", e);
    }
}
test();
