import { Router } from 'express';
import { WalletService } from '../services/wallet.js';

const router = Router();
const walletService = new WalletService();

router.get('/:agentId/balance', async (req, res) => {
    try {
        const agentId = req.params.agentId;
        const address = await walletService.getAgentAddress(agentId);
        const balance = await walletService.getBalance(address);

        res.json({
            ...balance,
            walletAddress: address
        });
    } catch (error) {
        console.error('Balance fetch failed:', error);
        res.status(500).json({ message: 'Failed to fetch balance' });
    }
});

export default router;
