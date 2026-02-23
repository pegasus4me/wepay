import supabase from '../db.js';
import crypto from 'crypto';

export interface PaymentIntentInput {
    amount: number;
    currency: string;
    description?: string;
    payerId?: string;
}

export class PaymentIntentService {
    async createIntent(agentId: string, data: PaymentIntentInput) {
        const id = `pi_${crypto.randomUUID()}`;

        // Ensure agent exists
        await supabase.from('agents').upsert({
            id: agentId,
            wallet_address: '0xE5261f469bAc513C0a0575A3b686847F48Bc6687'
        }, { onConflict: 'id', ignoreDuplicates: true });

        const { error } = await supabase.from('payment_intents').insert({
            id,
            agent_id: agentId,
            amount: data.amount,
            currency: data.currency,
            description: data.description || null,
            status: 'pending',
            payer_id: data.payerId || null,
        });

        if (error) throw new Error(`Failed to create intent: ${error.message}`);
        return this.getIntent(id);
    }

    async getIntent(id: string): Promise<any> {
        const { data } = await supabase
            .from('payment_intents')
            .select('*')
            .eq('id', id)
            .single();

        if (!data) return null;
        return {
            id: data.id,
            agentId: data.agent_id,
            amount: data.amount,
            currency: data.currency,
            description: data.description,
            status: data.status,
            payerId: data.payer_id,
            paymentHash: data.payment_hash,
            createdAt: data.created_at,
        };
    }

    async markAsPaid(id: string, paymentHash: string) {
        const { error } = await supabase
            .from('payment_intents')
            .update({ status: 'paid', payment_hash: paymentHash })
            .eq('id', id);

        if (error) throw new Error(`Failed to mark intent as paid: ${error.message}`);
    }
}
