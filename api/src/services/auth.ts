import crypto from 'crypto';
import db from '../db.js';

export class AuthService {
    /**
     * Generates a new API key for an agent.
     * format: sk_live_<random_hex>
     */
    generateApiKey(): string {
        const randomBytes = crypto.randomBytes(24).toString('hex');
        return `sk_live_${randomBytes}`; // Total length: 8 + 48 = 56 chars
    }

    /**
     * Hashes the API key for storage.
     */
    hashKey(apiKey: string): string {
        return crypto.createHash('sha256').update(apiKey).digest('hex');
    }

    /**
     * Creates a new API key for an agent and stores the hash.
     */
    createKeyForAgent(agentId: string, label?: string): string {
        const apiKey = this.generateApiKey();
        const keyHash = this.hashKey(apiKey);

        const stmt = db.prepare('INSERT INTO api_keys (key_hash, agent_id, label) VALUES (?, ?, ?)');
        stmt.run(keyHash, agentId, label || null);

        return apiKey; // Return the plain key once
    }

    /**
     * Validates an API key. Returns the agentId if valid, null otherwise.
     */
    validateKey(apiKey: string): string | null {
        const keyHash = this.hashKey(apiKey);
        const stmt = db.prepare('SELECT agent_id FROM api_keys WHERE key_hash = ?');
        const row = stmt.get(keyHash) as { agent_id: string } | undefined;

        return row ? row.agent_id : null;
    }
}
