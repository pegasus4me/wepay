import { Router } from 'express';
import { InvoiceService } from '../services/invoice.js';

const router = Router();
const invoiceService = new InvoiceService();

// Create an Invoice
router.post('/', (req, res) => {
    const agentId = req.headers['x-agent-id'] as string;
    if (!agentId) return res.status(401).json({ message: 'Missing x-agent-id header' });

    const { amount, currency, description, payerId } = req.body;
    if (!amount) return res.status(400).json({ message: 'Missing amount' });

    try {
        const invoice = invoiceService.createInvoice(agentId, {
            amount,
            currency: currency || 'USDC',
            description,
            payerId
        });

        // Add a helper "payLink" for the demo/frontend
        const fullInvoice = {
            ...invoice,
            payLink: `weppo://pay/${invoice.id}`
        };

        res.status(201).json(fullInvoice);
    } catch (error) {
        res.status(500).json({ message: 'Failed to create invoice', error: String(error) });
    }
});

// Get Invoice Status
router.get('/:id', (req, res) => {
    try {
        const invoice = invoiceService.getInvoice(req.params.id);
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch invoice', error: String(error) });
    }
});

export default router;
