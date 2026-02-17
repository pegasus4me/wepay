import { Router } from 'express';
import { WalletService } from '../services/wallet.js';
import { config } from '../config.js';
import { privateKeyToAccount } from 'viem/accounts';
const router = Router();
const walletService = new WalletService();
router.get('/:agentId/balance', async (req, res) => {
    try {
        if (!config.privateKey) {
            return res.status(500).json({ message: 'Server private key not configured' });
        }
        // In this POC, we use the server's main wallet as the source of funds for all agents
        const address = privateKeyToAccount(config.privateKey).address;
        const balance = await walletService.getBalance(address);
        res.json({
            ...balance,
            walletAddress: address
        });
    }
    catch (error) {
        console.error('Balance fetch failed:', error);
        res.status(500).json({ message: 'Failed to fetch balance' });
    }
});
export default router;
