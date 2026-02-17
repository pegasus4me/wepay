import { Weppo } from '../packages/sdk/src/index.js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * OpenClaw Tool: Weppo Integration
 * 
 * This is an example of how you wrap the Weppo SDK as a "Tool" 
 * that an OpenClaw agent can call autonomously.
 */

// 1. Initialize Weppo
const weppo = new Weppo({
    apiKey: process.env.API_SECRET || 'sk_test_weppo_123',
    agentId: 'openclaw_scout_01',
    baseUrl: `http://localhost:${process.env.PORT || 3111}/v1`,
});

/**
 * The "Pay" Tool for OpenClaw
 * Description: Use this tool whenever you need to pay a merchant or buy a service.
 * Inputs: 
 *  - recipient: The wallet address or Gateway address (0x...)
 *  - amount: The amount in USDC
 *  - memo: Why you are paying (e.g. "Payment for search results")
 *  - productId: (Optional) The x402 Product ID if purchasing from a Gateway
 */
export async function weppo_pay_tool(args: {
    recipient: string,
    amount: number,
    memo?: string,
    productId?: string
}) {
    try {
        console.log(`[OpenClaw Tool] Executing Weppo for ${args.amount} USDC...`);

        const receipt = await weppo.pay({
            to: args.recipient,
            amount: args.amount,
            memo: args.memo,
            productId: args.productId,
            currency: 'USDC'
        });

        return {
            success: true,
            receiptId: receipt.id,
            status: receipt.status,
            explorerUrl: receipt.explorerUrl,
            message: `Payment successful. TX: ${receipt.hash}`
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message,
            code: error.code || 'PAYMENT_ERROR'
        };
    }
}

/**
 * The "Balance" Tool for OpenClaw
 * Description: Use this tool to check how much money you have left before planning a task.
 */
export async function weppo_balance_tool() {
    try {
        const balance = await weppo.getBalance();
        return {
            amount: balance.amount,
            currency: balance.currency,
            wallet: balance.walletAddress
        };
    } catch (error: any) {
        return { error: error.message };
    }
}

console.log('OpenClaw Weppo Tools initialized.');
