import { Router } from 'express';
import { MarketService } from '../services/market.js';

const router = Router();
const marketService = new MarketService();

// List all services (Discovery)
router.get('/services', (req, res) => {
    try {
        const services = marketService.listServices();
        res.json(services);
    } catch (error) {
        res.status(500).json({ message: 'Failed to list services', error: error instanceof Error ? error.message : String(error) });
    }
});

// Register a new service
router.post('/services', async (req, res) => {
    const agentId = req.headers['x-agent-id'] as string;
    if (!agentId) return res.status(401).json({ message: 'Missing x-agent-id header' });

    const { name, description, price, currency, endpointUrl, collateralAmount } = req.body;

    if (!name || !price || !endpointUrl) {
        return res.status(400).json({ message: 'Missing required fields: name, price, endpointUrl' });
    }

    try {
        const service = await marketService.createService(agentId, {
            name,
            description,
            price,
            currency: currency || 'USDC',
            endpointUrl,
            collateralAmount
        });
        res.status(201).json(service);
    } catch (error) {
        res.status(500).json({ message: 'Failed to create service', error: error instanceof Error ? error.message : String(error) });
    }
});

export default router;
