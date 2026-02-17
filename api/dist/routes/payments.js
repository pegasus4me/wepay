import { Router } from 'express';
import { PaymentService } from '../services/payment.js';
import { PaymasterService } from '../services/paymaster.js';
import { config } from '../config.js';
import { privateKeyToAccount } from 'viem/accounts';
import db from '../db.js';
import crypto from 'crypto';
const router = Router();
const paymentService = new PaymentService();
const paymasterService = new PaymasterService();
const WALLET_ADDRESS = config.privateKey ? privateKeyToAccount(config.privateKey).address : '0x0';
router.post('/', async (req, res) => {
    const { to, amount, currency, memo, productId } = req.body;
    const agentId = req.headers['x-agent-id'];
    if (!agentId)
        return res.status(401).json({ message: 'Missing agent ID' });
    if (!to || !amount)
        return res.status(400).json({ message: 'Missing payment details' });
    try {
        const id = `pay_${crypto.randomUUID()}`;
        // Ensure agent exists in DB (simplified for POC)
        // We use the server address for the POC as the agent's wallet
        db.prepare('INSERT OR IGNORE INTO agents (id, wallet_address) VALUES (?, ?)').run(agentId, WALLET_ADDRESS);
        // Execute on-chain payment and wait for receipt
        const { hash, gasUsed, effectiveGasPrice } = await paymentService.executePayment(to, amount);
        // Record in DB
        db.prepare(`
      INSERT INTO payments (id, agent_id, amount, currency, recipient, status, hash, memo, product_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, agentId, amount, currency || 'USDC', to, 'confirmed', hash, memo || '', productId || null);
        // Track sponsorship via Paymaster
        await paymasterService.trackSponsorship(id, gasUsed, effectiveGasPrice);
        const sponsorshipStats = paymasterService.getAgentStats(agentId);
        res.json({
            id,
            status: 'confirmed',
            amount,
            currency: currency || 'USDC',
            to,
            hash,
            productId,
            explorerUrl: paymentService.getExplorerUrl(hash),
            sponsorship: {
                gasUsed: gasUsed.toString(),
                costSponsored: true,
                cumulativeAgentSponsorship: sponsorshipStats.totalSponsorshipEth
            },
            createdAt: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('Payment execution failed:', error);
        res.status(500).json({
            message: error instanceof Error ? error.message : 'Payment execution failed',
            code: 'PAYMENT_FAILED'
        });
    }
});
router.get('/:id', (req, res) => {
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
    if (!payment)
        return res.status(404).json({ message: 'Payment not found' });
    res.json({
        ...payment,
        explorerUrl: payment.hash ? paymentService.getExplorerUrl(payment.hash) : null
    });
});
export default router;
