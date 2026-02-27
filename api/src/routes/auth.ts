import { Router } from 'express';
import { AuthService } from '../services/auth.js';

const router = Router();
const authService = new AuthService();

// Generate a new API Key for an agent
// POST /auth/keys  (also aliased as POST /auth/key)
// Body: { agentId: string, label?: string, userId?: string, customKey?: string }
router.post('/keys', async (req, res) => {
    try {
        const { agentId, label, userId, customKey } = req.body;

        if (!agentId) {
            return res.status(400).json({ error: 'agentId is required' });
        }

        const apiKey = await authService.createKeyForAgent(agentId, label, userId, customKey);

        // Fetch the provisioned wallet address
        const db = (await import('../db.js')).default;
        const { data: agentRow } = await db
            .from('agents')
            .select('wallet_address')
            .eq('id', agentId)
            .maybeSingle();

        res.json({ apiKey, agentId, label, walletAddress: agentRow?.wallet_address || null });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Alias for dashboard convenience
router.post('/key', async (req, res) => {
    try {
        const { agentId, label, userId } = req.body;

        if (!agentId) {
            return res.status(400).json({ error: 'agentId is required' });
        }

        const apiKey = await authService.createKeyForAgent(agentId, label, userId);

        const db = (await import('../db.js')).default;
        const { data: agentRow } = await db
            .from('agents')
            .select('wallet_address')
            .eq('id', agentId)
            .maybeSingle();

        res.json({ apiKey, agentId, label, walletAddress: agentRow?.wallet_address || null });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// List all keys for an agent
router.get('/keys/:agentId', async (req, res) => {
    try {
        const { agentId } = req.params;
        const keys = await authService.listKeysForAgent(agentId);
        res.json(keys);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Revoke a key
router.delete('/keys/:agentId/:keyHash', async (req, res) => {
    try {
        const { agentId, keyHash } = req.params;
        await authService.revokeKey(agentId, keyHash);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
