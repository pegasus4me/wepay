import supabase from '../db.js';
import crypto from 'crypto';

export interface ServiceInput {
    name: string;
    description?: string;
    price: number;
    currency: string;
    endpointUrl: string;
    collateralAmount?: number;
}

export class MarketService {
    async createService(agentId: string, data: ServiceInput) {
        const id = `srv_${crypto.randomUUID()}`;

        // Auto-create agent if not exist
        await supabase.from('agents').upsert(
            { id: agentId, wallet_address: '0xE5261f469bAc513C0a0575A3b686847F48Bc6687' },
            { onConflict: 'id', ignoreDuplicates: true }
        );

        const { error } = await supabase.from('agent_services').insert({
            id,
            provider_agent_id: agentId,
            name: data.name,
            description: data.description || null,
            price: data.price,
            currency: data.currency,
            endpoint_url: data.endpointUrl,
            collateral_amount: data.collateralAmount || 0,
        });

        if (error) throw new Error(`Failed to create service: ${error.message}`);
        return this.getService(id);
    }

    async getService(id: string) {
        const { data } = await supabase
            .from('agent_services')
            .select('*')
            .eq('id', id)
            .single();

        return data ? this.mapRow(data) : null;
    }

    async listServices() {
        const { data } = await supabase
            .from('agent_services')
            .select('*')
            .order('created_at', { ascending: false });

        return (data || []).map(this.mapRow);
    }

    private mapRow(row: any) {
        return {
            id: row.id,
            providerAgentId: row.provider_agent_id,
            name: row.name,
            description: row.description,
            price: row.price,
            currency: row.currency,
            endpointUrl: row.endpoint_url,
            collateralAmount: row.collateral_amount,
            createdAt: row.created_at,
        };
    }
}
