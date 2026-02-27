import { Router } from 'express';
import { WalletService } from '../services/wallet.js';
import { PaymentService } from '../services/payment.js';
const router = Router();
const walletService = new WalletService();
const paymentService = new PaymentService();
router.get('/:agentId/allowances', async (req, res) => {
    try {
        const agentId = req.params.agentId;
        const allowances = await paymentService.getAllowances(agentId);
        res.json(allowances);
    }
    catch (error) {
        console.error('Allowances fetch failed:', error);
        res.status(500).json({ message: error.message || 'Failed to fetch allowances' });
    }
});
router.post('/:agentId/pre-authorize', async (req, res) => {
    try {
        const agentId = req.params.agentId;
        const { spender, amount } = req.body;
        if (!spender || amount === undefined) {
            return res.status(400).json({ error: 'Missing spender or amount' });
        }
        // Execute the pre-authorization using CDP Server Wallet on behalf of the agent
        const result = await paymentService.executePreAuth(agentId, spender, Number(amount));
        res.json({ status: 'confirmed', txHash: result.hash });
    }
    catch (error) {
        console.error('Pre-authorize failed:', error);
        res.status(500).json({ message: error.message || 'Failed to pre-authorize' });
    }
});
router.get('/:agentId/balance', async (req, res) => {
    try {
        const agentId = req.params.agentId;
        const address = await walletService.getAgentAddress(agentId);
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
