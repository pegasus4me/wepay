import { createPublicClient, createWalletClient, http, parseUnits, formatUnits, encodeFunctionData, getAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { config } from '../config.js';
import { CdpClient } from '@coinbase/cdp-sdk';
import db from '../db.js';
let cdp = null;
if (config.cdpApiKeyId && config.cdpApiKeySecret && config.cdpWalletSecret) {
    cdp = new CdpClient({
        apiKeyName: config.cdpApiKeyId,
        apiKeySecret: config.cdpApiKeySecret,
        walletSecret: config.cdpWalletSecret
    });
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
];
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
            { name: 'memo', type: 'string' }
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
    {
        name: 'allowances',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: '', type: 'address' },
            { name: '', type: 'address' }
        ],
        outputs: [{ name: '', type: 'uint256' }],
    },
];
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
];
// Helper: look up agent's CDP wallet address from DB
async function getWalletAddress(agentId) {
    const { data, error } = await db
        .from('agents')
        .select('wallet_address')
        .eq('id', agentId)
        .maybeSingle();
    if (error)
        throw new Error(`DB error for agent ${agentId}: ${error.message}`);
    if (!data || !data.wallet_address)
        throw new Error(`Wallet address not found for agent ${agentId}`);
    return data.wallet_address;
}
// Helper: resolve an agentId OR raw 0x address to an EVM address
async function resolveAddress(idOrAddress) {
    if (idOrAddress.startsWith('0x'))
        return getAddress(idOrAddress);
    return getWalletAddress(idOrAddress);
}
// Helper: get USDC decimals (cached conceptually, always 6 for USDC)
async function getUsdcDecimals(publicClient) {
    return publicClient.readContract({
        address: config.usdcAddress,
        abi: USDC_ABI,
        functionName: 'decimals',
    });
}
// Helper: send a tx via CDP from a given agent's wallet
async function sendViaCdp(agentAddress, to, data, publicClient) {
    if (!cdp)
        throw new Error('CDP Client not configured');
    const tx = await cdp.evm.sendTransaction({
        address: agentAddress,
        transaction: { to, data, value: BigInt(0) },
        network: 'base-sepolia',
    });
    const hash = tx.transactionHash;
    await publicClient.waitForTransactionReceipt({ hash, timeout: 60000 });
    return hash;
}
export class PaymentService {
    account = config.privateKey ? privateKeyToAccount(config.privateKey) : null;
    publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(config.rpcUrl),
    });
    walletClient = createWalletClient({
        account: this.account,
        chain: baseSepolia,
        transport: http(config.rpcUrl),
    });
    async logTransaction(data) {
        try {
            await db.from('transactions').insert({
                hash: data.hash,
                agent_id: data.agentId,
                recipient: data.recipient,
                amount: data.amount,
                currency: data.currency || 'USDC',
                memo: data.memo || null,
                type: data.type,
                gas_used: data.gasUsed?.toString(),
                effective_gas_price: data.effectiveGasPrice?.toString(),
            });
            console.log(`[DB] Logged transaction ${data.hash}`);
        }
        catch (e) {
            console.error(`[DB] Failed to log transaction ${data.hash}:`, e);
        }
    }
    async getAllowances(agentId) {
        const ownerAddress = await getWalletAddress(agentId);
        // Find all unique recipients this agent has pre-authorized
        const { data: txs, error } = await db
            .from('transactions')
            .select('recipient')
            .eq('agent_id', agentId)
            .eq('type', 'pre_authorization');
        if (error)
            throw new Error(`DB error fetching allowance history: ${error.message}`);
        const spenderIds = [...new Set((txs || []).map(tx => tx.recipient))];
        const allowances = [];
        const decimals = await getUsdcDecimals(this.publicClient);
        for (const spenderId of spenderIds) {
            try {
                const spenderAddress = await resolveAddress(spenderId);
                const rawAllowance = await this.publicClient.readContract({
                    address: config.weppoAddress,
                    abi: WEPPO_ABI,
                    functionName: 'allowances',
                    args: [ownerAddress, spenderAddress],
                });
                if (rawAllowance > 0n) {
                    allowances.push({
                        spenderId,
                        spenderAddress,
                        amount: Number(formatUnits(rawAllowance, decimals))
                    });
                }
            }
            catch (e) {
                console.warn(`[PaymentService] Failed to read allowance for spender ${spenderId}`, e.message);
            }
        }
        return allowances;
    }
    // -------------------------------------------------------------------------
    // Direct P2P Payment (USDC transfer)
    // -------------------------------------------------------------------------
    async executePayment(agentId, recipient, amount, productId, memo) {
        if (!cdp)
            throw new Error('CDP Client not configured');
        const walletAddress = await getWalletAddress(agentId);
        // Route to x402 Purchase if productId is present
        if (productId) {
            return this.executePurchase(agentId, walletAddress, recipient, productId, amount, memo || '');
        }
        const decimals = await getUsdcDecimals(this.publicClient);
        const amountInUnits = parseUnits(amount.toString(), decimals);
        const data = encodeFunctionData({
            abi: USDC_ABI,
            functionName: 'transfer',
            args: [getAddress(recipient), amountInUnits]
        });
        console.log(`[PaymentService] USDC transfer via CDP from ${walletAddress}...`);
        const tx = await cdp.evm.sendTransaction({
            address: walletAddress,
            transaction: { to: config.usdcAddress, data, value: BigInt(0) },
            network: 'base-sepolia',
        });
        const hash = tx.transactionHash;
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
        await this.logTransaction({
            hash,
            agentId,
            recipient,
            amount,
            memo,
            type: 'payment',
            gasUsed: receipt.gasUsed,
            effectiveGasPrice: receipt.effectiveGasPrice
        });
        return { hash, gasUsed: receipt.gasUsed, effectiveGasPrice: receipt.effectiveGasPrice };
    }
    // -------------------------------------------------------------------------
    // x402 Purchase (approve + buy via MerchantGateway)
    // -------------------------------------------------------------------------
    async executePurchase(agentId, walletAddress, gatewayAddress, productId, amount, memo) {
        if (!cdp)
            throw new Error('CDP Client not configured');
        const decimals = await getUsdcDecimals(this.publicClient);
        const amountInUnits = parseUnits(amount.toString(), decimals);
        // 1. Approve Gateway to spend USDC
        console.log(`[PaymentService] Approving Gateway ${gatewayAddress} for ${amount} USDC...`);
        const approveData = encodeFunctionData({
            abi: [{ name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: 'success', type: 'bool' }] }],
            functionName: 'approve',
            args: [getAddress(gatewayAddress), amountInUnits],
        });
        await sendViaCdp(walletAddress, config.usdcAddress, approveData, this.publicClient);
        // 2. Call buy() on Gateway
        let productIdBigInt;
        try {
            productIdBigInt = BigInt(productId);
        }
        catch {
            productIdBigInt = 0n;
        }
        console.log(`[PaymentService] Calling buy() for Product ${productIdBigInt}...`);
        const buyData = encodeFunctionData({
            abi: MERCHANT_GATEWAY_ABI,
            functionName: 'buy',
            args: [productIdBigInt, memo],
        });
        const tx = await cdp.evm.sendTransaction({
            address: walletAddress,
            transaction: { to: getAddress(gatewayAddress), data: buyData, value: BigInt(0) },
            network: 'base-sepolia',
        });
        const hash = tx.transactionHash;
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
        await this.logTransaction({
            hash,
            agentId,
            recipient: gatewayAddress,
            amount,
            memo: memo || `Purchased product ${productId}`,
            type: 'purchase',
            gasUsed: receipt.gasUsed,
            effectiveGasPrice: receipt.effectiveGasPrice
        });
        return { hash, gasUsed: receipt.gasUsed, effectiveGasPrice: receipt.effectiveGasPrice };
    }
    // -------------------------------------------------------------------------
    // Deposit USDC into Weppo Escrow (approve + deposit)
    // msg.sender = agent's CDP wallet
    // -------------------------------------------------------------------------
    async executeDeposit(agentId, amount) {
        if (!cdp)
            throw new Error('CDP Client not configured');
        try {
            const walletAddress = await getWalletAddress(agentId);
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
            await this.logTransaction({
                hash,
                agentId,
                recipient: config.weppoAddress,
                amount,
                type: 'deposit'
            });
            return { hash };
        }
        catch (error) {
            console.error(`[PaymentService] Deposit failed for ${agentId}:`, error);
            throw new Error(`Deposit failed: ${error.message || error}`);
        }
    }
    async executePreAuth(callerAgentId, spenderId, maxAmount) {
        if (!cdp)
            throw new Error('CDP Client not configured');
        const callerAddress = await getWalletAddress(callerAgentId); // Alice
        const spenderAddress = await resolveAddress(spenderId); // Bob
        const decimals = await getUsdcDecimals(this.publicClient);
        const amountInUnits = parseUnits(maxAmount.toString(), decimals);
        console.log(`[PaymentService] PreAuth: allowances[${callerAddress}][${spenderAddress}] = ${maxAmount} USDC`);
        const preAuthData = encodeFunctionData({
            abi: WEPPO_ABI,
            functionName: 'preAuthorize',
            args: [spenderAddress, amountInUnits],
        });
        // Sent from Alice's wallet so msg.sender == Alice
        const hash = await sendViaCdp(callerAddress, config.weppoAddress, preAuthData, this.publicClient);
        await this.logTransaction({
            hash,
            agentId: callerAgentId,
            recipient: spenderId,
            amount: maxAmount,
            memo: `Pre-authorized ${spenderId}`,
            type: 'pre_authorization'
        });
        return { hash };
    }
    // -------------------------------------------------------------------------
    // Charge Alice (Bob pulls from allowances[alice][bob])
    // msg.sender = Bob's CDP wallet → contract checks allowances[alice][bob]
    // -------------------------------------------------------------------------
    async executeCharge(callerAgentId, fromId, amount, memo) {
        if (!cdp)
            throw new Error('CDP Client not configured');
        const callerAddress = await getWalletAddress(callerAgentId); // Bob (the spender)
        const fromAddress = await resolveAddress(fromId); // Alice (the payer)
        const decimals = await getUsdcDecimals(this.publicClient);
        const amountInUnits = parseUnits(amount.toString(), decimals);
        console.log(`[PaymentService] Charge: Bob (${callerAddress}) pulling ${amount} USDC from Alice (${fromAddress})`);
        const chargeData = encodeFunctionData({
            abi: WEPPO_ABI,
            functionName: 'charge',
            args: [fromAddress, amountInUnits, memo],
        });
        // Sent from Bob's wallet so msg.sender == Bob == the pre-authorized spender
        if (!cdp)
            throw new Error('CDP Client not configured');
        const tx = await cdp.evm.sendTransaction({
            address: callerAddress,
            transaction: { to: config.weppoAddress, data: chargeData, value: BigInt(0) },
            network: 'base-sepolia',
        });
        const hash = tx.transactionHash;
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash, timeout: 60000 });
        await this.logTransaction({
            hash,
            agentId: fromId, // The person who paid
            recipient: callerAgentId, // The person who collected
            amount,
            memo: memo || 'Charged via Pre-Authorization',
            type: 'charge',
            gasUsed: receipt.gasUsed,
            effectiveGasPrice: receipt.effectiveGasPrice
        });
        return { hash, gasUsed: receipt.gasUsed, effectiveGasPrice: receipt.effectiveGasPrice };
    }
    // -------------------------------------------------------------------------
    // Meta-Tx Relay (for SDK-signed forward requests)
    // -------------------------------------------------------------------------
    async relayTransaction(request) {
        if (!this.account)
            throw new Error('Private key not configured');
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
        ];
        const safeRequest = {
            from: request.from,
            to: request.to,
            value: BigInt(request.value),
            gas: BigInt(request.gas),
            deadline: Number(request.deadline),
            data: request.data,
            signature: request.signature,
        };
        const hash = await this.walletClient.writeContract({
            address: config.forwarderAddress,
            abi: ForwarderABI,
            functionName: 'execute',
            args: [safeRequest],
        });
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
        // Log the relayed meta-transaction
        await this.logTransaction({
            hash,
            agentId: request.from,
            recipient: request.to,
            // rough approximation assuming 6 decimals for logs or generic tx
            amount: request.value ? Number(request.value) / 1000000 : 0,
            memo: `Relayed Meta-Transaction`,
            type: 'meta_transaction',
            gasUsed: receipt.gasUsed,
            effectiveGasPrice: receipt.effectiveGasPrice
        });
        return { hash, gasUsed: receipt.gasUsed, effectiveGasPrice: receipt.effectiveGasPrice };
    }
    getExplorerUrl(hash) {
        return `https://sepolia.basescan.org/tx/${hash}`;
    }
}
