import { Router } from 'express';
import { PaymentService } from '../services/payment.js';

const router = Router();
const paymentService = new PaymentService();

/**
 * Standard P2P Payment (Custodial transfer via CDP)
 */
router.post('/', async (req, res) => {
    try {
        const { recipient: reqRecipient, amount, to, productId, memo } = req.body;
        const recipient = reqRecipient || to;
        const agentId = (req as any).agentId;

        if (!agentId) {
            return res.status(401).json({ error: 'Unauthorized: No agent identified' });
        }

        const result = await paymentService.executePayment(agentId, recipient, amount, productId, memo);

        res.json({
            id: result.hash,
            status: 'confirmed',
            ...result,
            gasUsed: result.gasUsed.toString(),
            effectiveGasPrice: result.effectiveGasPrice.toString()
        });
    } catch (error: any) {
        console.error('[API] Payment Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Open Economy x402 Relay (EIP-3009)
 * Relays a signed transferWithAuthorization directly to USDC contract.
 */
router.post('/relay-x402', async (req, res) => {
    try {
        const { payload } = req.body;
        // The agent ID of the SELLER (who is receiving the payment and relaying the check)
        const agentId = (req as any).agentId; 

        if (!agentId) {
            return res.status(401).json({ error: 'Unauthorized: No agent identified' });
        }

        const result = await paymentService.relayEip3009(agentId, payload);

        res.json({
            id: result.hash,
            status: 'confirmed',
            ...result,
            gasUsed: result.gasUsed.toString(),
            effectiveGasPrice: result.effectiveGasPrice.toString()
        });
    } catch (error: any) {
        console.error('[API] x402 Relay Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get payment details (placeholder)
router.get('/:id', async (req, res) => {
    res.json({ id: req.params.id, status: 'confirmed' });
});

export default router;
