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
    const { to, amount, currency, memo, productId, invoiceId } = req.body;
    const agentId = req.headers['x-agent-id'] as string;

    if (!agentId) return res.status(401).json({ message: 'Missing agent ID' });

    // --- Resolve Invoice if present ---
    let recipientAddress = to;
    let finalAmount = amount;
    let finalCurrency = currency || 'USDC';
    let finalDescription = memo;

    if (invoiceId) {
        const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as any;
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
        if (invoice.status === 'paid') return res.status(400).json({ message: 'Invoice already paid' });

        // Payer check (if invoice is restricted)
        if (invoice.payer_id && invoice.payer_id !== agentId) {
            return res.status(403).json({ message: 'You are not the designated payer for this invoice' });
        }

        finalAmount = invoice.amount;
        finalCurrency = invoice.currency;
        finalDescription = `Payment for Invoice ${invoiceId}: ${invoice.description || ''}`;

        // Resolve Recipient (Invoice Creator)
        const creator = db.prepare('SELECT wallet_address FROM agents WHERE id = ?').get(invoice.agent_id) as any;
        if (!creator) return res.status(500).json({ message: 'Invoice creator agent not found' });
        recipientAddress = creator.wallet_address;
    }

    if (!recipientAddress || !finalAmount) return res.status(400).json({ message: 'Missing payment details (to/amount or invoiceId)' });


    // --- Resolve Agent ID to Wallet Address if needed (if not already resolved from invoice) ---
    if (recipientAddress && !recipientAddress.startsWith('0x')) {
        const agent = db.prepare('SELECT wallet_address FROM agents WHERE id = ?').get(recipientAddress) as any;
        if (agent) {
            recipientAddress = agent.wallet_address;
        } else {
            return res.status(400).json({ message: `Recipient agent '${recipientAddress}' not found.` });
        }
    }

    // Resolve Service Provider if productId is present and to is not provided (optional enhancement)
    // For now we stick to 'to' field resolution.

    if (!recipientAddress || !recipientAddress.startsWith('0x')) {
        return res.status(400).json({ message: 'Invalid recipient address or agent ID.' });
    }

    try {
        const id = `pay_${crypto.randomUUID()}`;

        // Ensure agent exists in DB (simplified for POC)
        // We use the server address for the POC as the agent's wallet
        db.prepare('INSERT OR IGNORE INTO agents (id, wallet_address) VALUES (?, ?)').run(agentId, WALLET_ADDRESS);

        // Execute on-chain payment and wait for receipt
        const { hash, gasUsed, effectiveGasPrice } = await paymentService.executePayment(recipientAddress, finalAmount);

        // Record in DB
        db.prepare(`
      INSERT INTO payments (id, agent_id, amount, currency, recipient, status, hash, memo, product_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, agentId, finalAmount, finalCurrency, recipientAddress, 'confirmed', hash, finalDescription || '', productId || null);

        // Mark Invoice as Paid if applicable
        if (invoiceId) {
            db.prepare('UPDATE invoices SET status = ?, payment_hash = ? WHERE id = ?')
                .run('paid', hash, invoiceId);
        }

        // Track sponsorship via Paymaster
        await paymasterService.trackSponsorship(id, gasUsed, effectiveGasPrice);

        const sponsorshipStats = paymasterService.getAgentStats(agentId);

        res.json({
            id,
            status: 'confirmed',
            amount: finalAmount,
            currency: finalCurrency,
            to: recipientAddress,
            hash,
            productId,
            invoiceId,
            explorerUrl: paymentService.getExplorerUrl(hash),
            sponsorship: {
                gasUsed: gasUsed.toString(),
                costSponsored: true,
                cumulativeAgentSponsorship: sponsorshipStats.totalSponsorshipEth
            },
            createdAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Payment execution failed:', error);
        res.status(500).json({
            message: error instanceof Error ? error.message : 'Payment execution failed',
            code: 'PAYMENT_FAILED'
        });
    }
});

router.get('/:id', (req, res) => {
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id) as any;
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    res.json({
        ...payment,
        explorerUrl: payment.hash ? paymentService.getExplorerUrl(payment.hash) : null
    });
});

export default router;
