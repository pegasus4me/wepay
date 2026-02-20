import crypto from 'crypto';
import db from '../db.js';
import { CdpClient } from '@coinbase/cdp-sdk';
import { config } from '../config.js';

let cdp: CdpClient | null = null;
if (config.cdpApiKeyId && config.cdpApiKeySecret && config.cdpWalletSecret) {
    cdp = new CdpClient({
        apiKeyName: config.cdpApiKeyId,
        apiKeySecret: config.cdpApiKeySecret,
        walletSecret: config.cdpWalletSecret
    } as any); // SDK docs note: the SDK usually requires apiKeyName for backwards compatibility but docs say apiKeyId.
} else {
    console.warn('[AuthService] CDP Keys not configured. New agent registration will fail or use fallback placeholder wallets.');
}

export class AuthService {
    /**
     * Generates a new API key for an agent.
     * format: weppo_key_<random_hex>
     */
    generateApiKey(): string {
        const randomBytes = crypto.randomBytes(24).toString('hex');
        return `weppo_key_${randomBytes}`; // Total length: 8 + 48 = 56 chars
    }

    /**
     * Hashes the API key for storage.
     */
    hashKey(apiKey: string): string {
        return crypto.createHash('sha256').update(apiKey).digest('hex');
    }

    /**
     * Creates a new API key for an agent and stores the hash.
     * Also auto-provisions an EVM account using the CDP Server Wallet v2.
     */
    async createKeyForAgent(agentId: string, label?: string): Promise<string> {
        // Ensure agent exists
        const agentCheck = db.prepare('SELECT id FROM agents WHERE id = ?').get(agentId);
        if (!agentCheck) {
            console.log(`[AuthService] Generating secure EVM Account for new agent ${agentId}...`);
            let address = '0x0000000000000000000000000000000000000000'; // fallback

            if (cdp) {
                try {
                    const account = await cdp.evm.createAccount();
                    address = account.address;
                    console.log(`[AuthService] Account created successfully. Address: ${address}`);
                } catch (error) {
                    console.error('[AuthService] Failed to generate CDP account:', error);
                    throw new Error('EVM Account generation failed. Please check CDP metrics or rate limits.');
                }
            }

            // Store securely in our database
            db.prepare(`
                INSERT INTO agents (id, wallet_address) 
                VALUES (?, ?)
            `).run(agentId, address);
        }

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
