import { createPublicClient, http, formatEther, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';
import { config } from '../config.js';

const USDC_ABI = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: 'balance', type: 'uint256' }],
    },
    {
        name: 'decimals',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: 'decimals', type: 'uint8' }],
    }
] as const;

async function checkBalance() {
    const address = "0xE1C1279Fb9160634aaFBc35eDa9c30a8Ba8c1137";
    const publicClient = createPublicClient({ chain: baseSepolia, transport: http(config.rpcUrl) });
    
    const ethBalance = await publicClient.getBalance({ address });
    console.log(`ETH Balance: ${formatEther(ethBalance)}`);

    const decimals = await publicClient.readContract({
        address: config.usdcAddress,
        abi: USDC_ABI,
        functionName: 'decimals'
    });

    const usdcBalance = await publicClient.readContract({
        address: config.usdcAddress,
        abi: USDC_ABI,
        functionName: 'balanceOf',
        args: [address]
    });
    
    console.log(`USDC Balance: ${formatUnits(usdcBalance as any, decimals as any)}`);
}
checkBalance();
