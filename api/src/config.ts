import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: process.env.PORT || 3111,
    apiSecret: process.env.API_SECRET || 'weppo_test_secret',
    privateKey: process.env.PRIVATE_KEY as `0x${string}`,
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    usdcAddress: (process.env.USDC_CONTRACT_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e') as `0x${string}`,
    weppoAddress: (process.env.WEPPO_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
    forwarderAddress: (process.env.FORWARDER_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`,
};

if (!config.privateKey) {
    console.warn('WARNING: PRIVATE_KEY not found in environment. Payment execution will fail.');
}
