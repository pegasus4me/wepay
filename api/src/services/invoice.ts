import db from '../db.js';
import crypto from 'crypto';

export interface InvoiceInput {
    amount: number;
    currency: string;
    description?: string;
    payerId?: string; // Optional: restrict who can pay this
}

export class InvoiceService {
    createInvoice(agentId: string, data: InvoiceInput) {
        const id = `inv_${crypto.randomUUID()}`;

        // Ensure agent exists (simple onboarding for MVP)
        db.prepare('INSERT OR IGNORE INTO agents (id, wallet_address) VALUES (?, ?)').run(agentId, '0xE5261f469bAc513C0a0575A3b686847F48Bc6687');

        const stmt = db.prepare(`
            INSERT INTO invoices (id, agent_id, amount, currency, description, status, payer_id)
            VALUES (?, ?, ?, ?, ?, 'pending', ?)
        `);

        stmt.run(
            id,
            agentId,
            data.amount,
            data.currency,
            data.description || null,
            data.payerId || null
        );

        return this.getInvoice(id);
    }

    getInvoice(id: string): any {
        const row = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any;
        if (!row) return null;
        return {
            id: row.id,
            agentId: row.agent_id,
            amount: row.amount,
            currency: row.currency,
            description: row.description,
            status: row.status,
            payerId: row.payer_id,
            paymentHash: row.payment_hash,
            createdAt: row.created_at
        };
    }

    // Mark as paid (called by PaymentService later)
    markAsPaid(id: string, paymentHash: string) {
        db.prepare('UPDATE invoices SET status = ?, payment_hash = ? WHERE id = ?')
            .run('paid', paymentHash, id);
    }
}
