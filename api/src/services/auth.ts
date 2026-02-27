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
    async createKeyForAgent(agentId: string, label?: string, userId?: string, customKey?: string): Promise<string> {
        // Ensure agent exists
        const { data: agentRow, error: agentError } = await db
            .from('agents')
            .select('id, user_id')
            .eq('id', agentId)
            .maybeSingle();

        if (agentError) throw new Error(`DB error checking agent: ${agentError.message}`);

        if (!agentRow) {
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
            const { error: insertError } = await db
                .from('agents')
                .insert({
                    id: agentId,
                    wallet_address: address,
                    user_id: userId || null
                });

            if (insertError) throw new Error(`DB error creating agent: ${insertError.message}`);
        } else if (userId && !agentRow.user_id) {
            // Claim existing unowned agent
            const { error: updateError } = await db
                .from('agents')
                .update({ user_id: userId })
                .eq('id', agentId);

            if (updateError) throw new Error(`DB error claiming agent: ${updateError.message}`);
        }

        const apiKey = customKey || this.generateApiKey();
        const keyHash = this.hashKey(apiKey);

        const { error: keyError } = await db
            .from('api_keys')
            .insert({ key_hash: keyHash, agent_id: agentId, label: label || null });

        if (keyError) throw new Error(`DB error creating API key: ${keyError.message}`);

        return apiKey; // Return the plain key once
    }

    /**
     * Validates an API key. Returns the agentId if valid, null otherwise.
     */
    async validateKey(apiKey: string): Promise<string | null> {
        const keyHash = this.hashKey(apiKey);
        const { data, error } = await db
            .from('api_keys')
            .select('agent_id')
            .eq('key_hash', keyHash)
            .maybeSingle();

        if (error) {
            console.error('[AuthService] API Key validation error:', error);
            return null;
        }

        return data ? data.agent_id : null;
    }

    /**
     * Lists all API keys for an agent.
     */
    async listKeysForAgent(agentId: string) {
        const { data, error } = await db
            .from('api_keys')
            .select('key_hash, label, created_at')
            .eq('agent_id', agentId);

        if (error) throw new Error(`DB error listing keys: ${error.message}`);
        return data;
    }

    /**
     * Revokes (deletes) an API key.
     */
    async revokeKey(agentId: string, keyHash: string) {
        const { error } = await db
            .from('api_keys')
            .delete()
            .eq('agent_id', agentId)
            .eq('key_hash', keyHash);

        if (error) throw new Error(`DB error revoking key: ${error.message}`);
        return true;
    }
}
