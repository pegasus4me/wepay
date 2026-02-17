import db from '../db.js';
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

        // Check if agent exists to satisfy FK constraint
        const agent = db.prepare('SELECT id FROM agents WHERE id = ?').get(agentId);
        if (!agent) {
            // For MVP/POC, we auto-create the agent record if missing
            // In prod, this should fail or require explicit registration
            // Use a placeholder wallet if not known
            db.prepare('INSERT OR IGNORE INTO agents (id, wallet_address) VALUES (?, ?)').run(agentId, '0xE5261f469bAc513C0a0575A3b686847F48Bc6687');
        }

        const stmt = db.prepare(`
            INSERT INTO agent_services (id, provider_agent_id, name, description, price, currency, endpoint_url, collateral_amount)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            id,
            agentId,
            data.name,
            data.description || null,
            data.price,
            data.currency,
            data.endpointUrl,
            data.collateralAmount || 0
        );

        return this.getService(id);
    }

    getService(id: string) {
        const row = db.prepare('SELECT * FROM agent_services WHERE id = ?').get(id) as any;
        if (!row) return null;
        return this.mapRow(row);
    }

    listServices() {
        const rows = db.prepare('SELECT * FROM agent_services ORDER BY created_at DESC').all() as any[];
        return rows.map(this.mapRow);
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
            createdAt: row.created_at
        };
    }
}
