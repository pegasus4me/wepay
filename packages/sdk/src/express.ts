// express.ts
import { Request, Response, NextFunction } from 'express';
import { WeppoClient } from './client.js';

/**
 * Configuration for the Weppo x402 Middleware.
 */
export interface WeppoMiddlewareOptions {
    client: WeppoClient;
    price: number | ((req: Request) => Promise<number | null>);
    memo?: string | ((req: Request) => string);
    agentIdHeader?: string;
    challengeOnly?: boolean;
}

/**
 * Express middleware that enforces a strict x402 Paywall using pure EIP-3009.
 */
export function weppoPaymentMiddleware(options: WeppoMiddlewareOptions) {
    const headerKey = (options.agentIdHeader || 'x-buyer-agent-id').toLowerCase();

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            let price: number | null = 0;
            if (typeof options.price === 'function') {
                price = await options.price(req);
            } else {
                price = options.price;
            }

            if (price === null || price === 0) {
                return next();
            }

            // 1. Check for x402 Authorization Header (The EIP-3009 Signature)
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.toLowerCase().startsWith('x402 ')) {
                // Parse the base64 payload from the client
                try {
                    const token = authHeader.split(' ')[1];
                    const decoded = Buffer.from(token, 'base64').toString('utf8');
                    const payload = JSON.parse(decoded);

                    // For an open economy, we send this signature to our API backend
                    // to relay the EIP-3009 transfer.
                    // Assuming options.client has a method for this:
                    const chargeRecord = await options.client.relayEip3009(payload);
                    
                    (req as any).weppoCharge = chargeRecord;
                    return next();
                } catch (error: any) {
                    console.error('[Weppo Middleware] Failed to settle x402 signature:', error);
                    return send402(res, price, "Payment Required: Invalid or failed x402 signature.");
                }
            }

            // 2. Challenge if no payment is provided
            // We use the exact format expected by @x402/fetch client
            return send402(res, price, "Payment Required");

        } catch (err: any) {
            console.error('[Weppo Middleware] Critical Error:', err);
            res.status(500).json({ error: "Internal Server Error in Payment Middleware" });
        }
    };
}

function send402(res: Response, amount: number, message: string) {
    // Standard x402 HTTP challenge header expected by @x402/fetch and @x402/evm
    // network is set to Base Sepolia (eip155:84532)
    res.setHeader('Www-Authenticate', `x402 scheme="exact" price="$${amount}" network="eip155:84532"`);
    
    res.status(402).json({
        error: "Payment Required",
        message,
        amount,
        currency: "USDC"
    });
}
