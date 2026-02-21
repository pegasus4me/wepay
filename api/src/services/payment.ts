import { createPublicClient, createWalletClient, http, parseUnits, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { config } from '../config.js';
import { CdpClient } from '@coinbase/cdp-sdk';
import db from '../db.js';

let cdp: CdpClient | null = null;
if (config.cdpApiKeyId && config.cdpApiKeySecret && config.cdpWalletSecret) {
    cdp = new CdpClient({
        apiKeyName: config.cdpApiKeyId,
        apiKeySecret: config.cdpApiKeySecret,
        walletSecret: config.cdpWalletSecret
    } as any);
}

const USDC_ABI = [
    {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'recipient', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: 'success', type: 'bool' }],
    },
    {
        name: 'decimals',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: 'decimals', type: 'uint8' }],
    },
] as const;

const WEPPO_ABI = [
    {
        name: 'preAuthorize',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'maxAmount', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        name: 'charge',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'from', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'memo', type: 'string' },
        ],
        outputs: [],
    },
    {
        name: 'deposit',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'amount', type: 'uint256' }],
        outputs: [],
    },
] as const;

const MERCHANT_GATEWAY_ABI = [
    {
        name: 'buy',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: '_productId', type: 'uint256' },
            { name: '_memo', type: 'string' }
        ],
        outputs: [],
    },
] as const;

// Helper: look up agent's CDP wallet address from DB
function getWalletAddress(agentId: string): string {
    const row = db.prepare('SELECT wallet_address FROM agents WHERE id = ?').get(agentId) as { wallet_address: string } | undefined;
    if (!row || !row.wallet_address) throw new Error(`Wallet address not found for agent ${agentId}`);
    return row.wallet_address;
}

// Helper: resolve an agentId OR raw 0x address to an EVM address
function resolveAddress(idOrAddress: string): string {
    if (idOrAddress.startsWith('0x')) return idOrAddress;
    return getWalletAddress(idOrAddress);
}

// Helper: get USDC decimals (cached conceptually, always 6 for USDC)
async function getUsdcDecimals(publicClient: any): Promise<number> {
    return publicClient.readContract({
        address: config.usdcAddress,
        abi: USDC_ABI,
        functionName: 'decimals',
    });
}

// Helper: send a tx via CDP from a given agent's wallet
async function sendViaCdp(agentAddress: string, to: `0x${string}`, data: `0x${string}`, publicClient: any): Promise<`0x${string}`> {
    if (!cdp) throw new Error('CDP Client not configured');
    const tx = await cdp.evm.sendTransaction({
        address: agentAddress,
        transaction: { to, data, value: BigInt(0) },
        network: 'base-sepolia',
    });
    const hash = tx.transactionHash as `0x${string}`;
    await publicClient.waitForTransactionReceipt({ hash, timeout: 60000 });
    return hash;
}

export class PaymentService {
    private account = config.privateKey ? privateKeyToAccount(config.privateKey) : null;

    private publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(config.rpcUrl),
    });

    private walletClient = createWalletClient({
        account: this.account!,
        chain: baseSepolia,
        transport: http(config.rpcUrl),
    });

    // -------------------------------------------------------------------------
    // Direct P2P Payment (USDC transfer)
    // -------------------------------------------------------------------------
    async executePayment(agentId: string, recipient: string, amount: number, productId?: string, memo?: string): Promise<{ hash: string; gasUsed: bigint; effectiveGasPrice: bigint }> {
        if (!cdp) throw new Error('CDP Client not configured');

        const walletAddress = getWalletAddress(agentId);

        // Route to x402 Purchase if productId is present
        if (productId) {
            return this.executePurchase(agentId, walletAddress, recipient, productId, amount, memo || '');
        }

        const decimals = await getUsdcDecimals(this.publicClient);
        const amountInUnits = parseUnits(amount.toString(), decimals);

        const data = encodeFunctionData({
            abi: USDC_ABI,
            functionName: 'transfer',
            args: [recipient as `0x${string}`, amountInUnits]
        });

        console.log(`[PaymentService] USDC transfer via CDP from ${walletAddress}...`);
        const tx = await cdp.evm.sendTransaction({
            address: walletAddress,
            transaction: { to: config.usdcAddress, data, value: BigInt(0) },
            network: 'base-sepolia',
        });

        const hash = tx.transactionHash as `0x${string}`;
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
        return { hash, gasUsed: receipt.gasUsed, effectiveGasPrice: receipt.effectiveGasPrice };
    }

    // -------------------------------------------------------------------------
    // x402 Purchase (approve + buy via MerchantGateway)
    // -------------------------------------------------------------------------
    async executePurchase(agentId: string, walletAddress: string, gatewayAddress: string, productId: string, amount: number, memo: string): Promise<{ hash: string; gasUsed: bigint; effectiveGasPrice: bigint }> {
        if (!cdp) throw new Error('CDP Client not configured');

        const decimals = await getUsdcDecimals(this.publicClient);
        const amountInUnits = parseUnits(amount.toString(), decimals);

        // 1. Approve Gateway to spend USDC
        console.log(`[PaymentService] Approving Gateway ${gatewayAddress} for ${amount} USDC...`);
        const approveData = encodeFunctionData({
            abi: [{ name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: 'success', type: 'bool' }] }],
            functionName: 'approve',
            args: [gatewayAddress as `0x${string}`, amountInUnits],
        });
        await sendViaCdp(walletAddress, config.usdcAddress, approveData, this.publicClient);

        // 2. Call buy() on Gateway
        let productIdBigInt: bigint;
        try { productIdBigInt = BigInt(productId); } catch { productIdBigInt = 0n; }

        console.log(`[PaymentService] Calling buy() for Product ${productIdBigInt}...`);
        const buyData = encodeFunctionData({
            abi: MERCHANT_GATEWAY_ABI,
            functionName: 'buy',
            args: [productIdBigInt, memo],
        });
        const tx = await cdp.evm.sendTransaction({
            address: walletAddress,
            transaction: { to: gatewayAddress, data: buyData, value: BigInt(0) },
            network: 'base-sepolia',
        });

        const hash = tx.transactionHash as `0x${string}`;
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
        return { hash, gasUsed: receipt.gasUsed, effectiveGasPrice: receipt.effectiveGasPrice };
    }

    // -------------------------------------------------------------------------
    // Deposit USDC into Weppo Escrow (approve + deposit)
    // msg.sender = agent's CDP wallet
    // -------------------------------------------------------------------------
    async executeDeposit(agentId: string, amount: number): Promise<{ hash: string }> {
        if (!cdp) throw new Error('CDP Client not configured');
        try {
            const walletAddress = getWalletAddress(agentId);
            const decimals = await getUsdcDecimals(this.publicClient);
            const amountInUnits = parseUnits(amount.toString(), decimals);

            // Step 1: approve(weppoAddress, amount)
            console.log(`[PaymentService] Approving Weppo for ${amount} USDC deposit (${agentId})...`);
            const approveData = encodeFunctionData({
                abi: [{ name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: 'success', type: 'bool' }] }],
                functionName: 'approve',
                args: [config.weppoAddress, amountInUnits],
            });
            await sendViaCdp(walletAddress, config.usdcAddress, approveData, this.publicClient);

            console.log(`[PaymentService] Waiting 5s for allowance to propagate...`);
            await new Promise(r => setTimeout(r, 5000));

            // Step 2: deposit(amount)
            console.log(`[PaymentService] Depositing ${amount} USDC into Weppo Escrow (${agentId})...`);
            const depositData = encodeFunctionData({
                abi: WEPPO_ABI,
                functionName: 'deposit',
                args: [amountInUnits],
            });
            const hash = await sendViaCdp(walletAddress, config.weppoAddress, depositData, this.publicClient);
            return { hash };
        } catch (error: any) {
            console.error(`[PaymentService] Deposit failed for ${agentId}:`, error);
            throw new Error(`Deposit failed: ${error.message || error}`);
        }
    }


    async executePreAuth(callerAgentId: string, spenderId: string, maxAmount: number): Promise<{ hash: string }> {
        if (!cdp) throw new Error('CDP Client not configured');

        const callerAddress = getWalletAddress(callerAgentId);   // Alice
        const spenderAddress = resolveAddress(spenderId);          // Bob

        const decimals = await getUsdcDecimals(this.publicClient);
        const amountInUnits = parseUnits(maxAmount.toString(), decimals);

        console.log(`[PaymentService] PreAuth: allowances[${callerAddress}][${spenderAddress}] = ${maxAmount} USDC`);
        const preAuthData = encodeFunctionData({
            abi: WEPPO_ABI,
            functionName: 'preAuthorize',
            args: [spenderAddress as `0x${string}`, amountInUnits],
        });

        // Sent from Alice's wallet so msg.sender == Alice
        const hash = await sendViaCdp(callerAddress, config.weppoAddress, preAuthData, this.publicClient);
        return { hash };
    }

    // -------------------------------------------------------------------------
    // Charge Alice (Bob pulls from allowances[alice][bob])
    // msg.sender = Bob's CDP wallet → contract checks allowances[alice][bob]
    // -------------------------------------------------------------------------
    async executeCharge(callerAgentId: string, fromId: string, amount: number, memo: string): Promise<{ hash: string; gasUsed: bigint; effectiveGasPrice: bigint }> {
        if (!cdp) throw new Error('CDP Client not configured');

        const callerAddress = getWalletAddress(callerAgentId);  // Bob (the spender)
        const fromAddress = resolveAddress(fromId);               // Alice (the payer)

        const decimals = await getUsdcDecimals(this.publicClient);
        const amountInUnits = parseUnits(amount.toString(), decimals);

        console.log(`[PaymentService] Charge: Bob (${callerAddress}) pulling ${amount} USDC from Alice (${fromAddress})`);
        const chargeData = encodeFunctionData({
            abi: WEPPO_ABI,
            functionName: 'charge',
            args: [fromAddress as `0x${string}`, amountInUnits, memo],
        });

        // Sent from Bob's wallet so msg.sender == Bob == the pre-authorized spender
        if (!cdp) throw new Error('CDP Client not configured');
        const tx = await cdp.evm.sendTransaction({
            address: callerAddress,
            transaction: { to: config.weppoAddress, data: chargeData, value: BigInt(0) },
            network: 'base-sepolia',
        });

        const hash = tx.transactionHash as `0x${string}`;
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash, timeout: 60000 });
        return { hash, gasUsed: receipt.gasUsed, effectiveGasPrice: receipt.effectiveGasPrice };
    }

    // -------------------------------------------------------------------------
    // Meta-Tx Relay (for SDK-signed forward requests)
    // -------------------------------------------------------------------------
    async relayTransaction(request: any): Promise<{ hash: string; gasUsed: bigint; effectiveGasPrice: bigint }> {
        if (!this.account) throw new Error('Private key not configured');

        const ForwarderABI = [
            {
                name: 'execute',
                type: 'function',
                stateMutability: 'payable',
                inputs: [
                    {
                        components: [
                            { name: 'from', type: 'address' },
                            { name: 'to', type: 'address' },
                            { name: 'value', type: 'uint256' },
                            { name: 'gas', type: 'uint256' },
                            { name: 'deadline', type: 'uint48' },
                            { name: 'data', type: 'bytes' },
                            { name: 'signature', type: 'bytes' },
                        ],
                        name: 'request',
                        type: 'tuple',
                    },
                ],
                outputs: [{ name: 'success', type: 'bool' }],
            },
        ] as const;

        const safeRequest = {
            from: request.from,
            to: request.to,
            value: BigInt(request.value),
            gas: BigInt(request.gas),
            deadline: Number(request.deadline),
            data: request.data,
            signature: request.signature as `0x${string}`,
        };

        const hash = await this.walletClient.writeContract({
            address: config.forwarderAddress,
            abi: ForwarderABI,
            functionName: 'execute',
            args: [safeRequest],
        });

        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
        return { hash, gasUsed: receipt.gasUsed, effectiveGasPrice: receipt.effectiveGasPrice };
    }

    getExplorerUrl(hash: string): string {
        return `https://sepolia.basescan.org/tx/${hash}`;
    }
}
