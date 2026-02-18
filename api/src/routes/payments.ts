import { Router } from 'express';
import { PaymentService } from '../services/payment.js';
import { PaymasterService } from '../services/paymaster.js';

const router = Router();
const paymentService = new PaymentService();
const paymasterService = new PaymasterService();

// Create a standard payment (server-side signing / custodial)
router.post('/', async (req, res) => {
    try {
        const { recipient, amount } = req.body;
        const result = await paymentService.executePayment(recipient, amount);

        // Track gas sponsorship
        // await paymasterService.trackSponsorship(result.hash, result.gasUsed, result.effectiveGasPrice);

        res.json({ status: 'confirmed', ...result });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get payment details
router.get('/:id', async (req, res) => {
    // Placeholder: In real app, fetch from DB
    res.json({ id: req.params.id, status: 'confirmed' });
});

// --- Custodial Endpoints (Deprecated / Transitional) ---

router.post('/pre-authorize', async (req, res) => {
    try {
        const { spender, maxAmount } = req.body;
        const result = await paymentService.executePreAuth(spender, maxAmount);
        res.json({ status: 'confirmed', txHash: result.hash });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/charge', async (req, res) => {
    try {
        const { from, amount, memo } = req.body;
        const result = await paymentService.executeCharge(from, amount, memo);
        res.json({ status: 'confirmed', ...result });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// --- Meta-Transaction Endpoints (Relayer) ---

router.post('/pre-authorize-meta', async (req, res) => {
    try {
        const { request } = req.body;
        console.log('[API] Relaying Pre-Auth Meta-Tx', request);

        const result = await paymentService.relayTransaction(request);
        res.json({ status: 'confirmed', txHash: result.hash });
    } catch (error: any) {
        console.error('[API] Relaying Failed:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/charge-meta', async (req, res) => {
    try {
        const { request } = req.body;
        console.log('[API] Relaying Charge Meta-Tx', request);


        export default router;
