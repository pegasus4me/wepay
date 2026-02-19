import { Router } from 'express';
import { PaymentIntentService } from '../services/payment_intent.js';

const router = Router();
const service = new PaymentIntentService();

// Create a Payment Intent
router.post('/', (req, res) => {
    const agentId = req.headers['x-agent-id'] as string;
    if (!agentId) return res.status(401).json({ message: 'Missing x-agent-id header' });

    const { amount, currency, description, payerId } = req.body;
    if (!amount) return res.status(400).json({ message: 'Missing amount' });

    try {
        const intent = service.createIntent(agentId, {
            amount,
            currency: currency || 'USDC',
            description,
            payerId
        });

        // Add a helper "payLink" for the demo/frontend
        const fullIntent = {
            ...intent,
            payLink: `weppo://pay/${intent.id}`
        };

        res.status(201).json(fullIntent);
    } catch (error) {
        res.status(500).json({ message: 'Failed to create payment intent', error: String(error) });
    }
});

// Get Payment Intent Status
router.get('/:id', (req, res) => {
    try {
        const intent = service.getIntent(req.params.id);
        if (!intent) return res.status(404).json({ message: 'Payment Intent not found' });
        res.json(intent);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch payment intent', error: String(error) });
    }
});

export default router;
