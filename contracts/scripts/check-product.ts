import { createPublicClient, createWalletClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import dotenv from 'dotenv';
dotenv.config({ path: 'api/.env', override: true }); // Load API env for keys (running from root)

// Debug
console.log('CWD:', process.cwd());
console.log('Loading env from api/.env');
console.log('PRIVATE_KEY length:', process.env.PRIVATE_KEY?.length);
console.log('GATEWAY:', process.env.MERCHANT_GATEWAY_ADDRESS);

const MERCHANT_GATEWAY_ABI = [
    {
        name: 'products',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: '', type: 'uint256' }],
        outputs: [
            { name: 'name', type: 'string' },
            { name: 'price', type: 'uint256' },
            { name: 'exists', type: 'bool' }
        ],
    },
    {
        name: 'setProduct',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: '_productId', type: 'uint256' },
            { name: '_name', type: 'string' },
            { name: '_price', type: 'uint256' }
        ],
        outputs: [],
    },
] as const;

async function main() {
    const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
    const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
    const gatewayAddress = process.env.MERCHANT_GATEWAY_ADDRESS as `0x${string}`;

    if (!privateKey || !gatewayAddress) {
        console.error('Missing env vars');
        return;
    }

    const client = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });
    const wallet = createWalletClient({ account: privateKeyToAccount(privateKey), chain: baseSepolia, transport: http(rpcUrl) });

    const productId = 102n;

    console.log(`Checking Product ${productId} at ${gatewayAddress}...`);
    const [name, price, exists] = await client.readContract({
        address: gatewayAddress,
        abi: MERCHANT_GATEWAY_ABI,
        functionName: 'products',
        args: [productId],
    });

    console.log(`Product 102: Exists=${exists}, Name=${name}, Price=${price}`);

    if (!exists) {
        console.log('Product does not exist. Attempting to create it...');
        try {
            const hash = await wallet.writeContract({
                address: gatewayAddress,
                abi: MERCHANT_GATEWAY_ABI,
                functionName: 'setProduct',
                args: [productId, 'Cheap Search', 10000n], // 0.01 USDC (6 decimals)
            });
            console.log(`Creation tx sent: ${hash}`);
            await client.waitForTransactionReceipt({ hash });
            console.log('Product created!');
        } catch (e: any) {
            console.error('Failed to create product. Are you the owner?', e.message);
        }
    }
}

main();
