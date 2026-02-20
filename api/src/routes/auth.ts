import { Router } from 'express';
import { AuthService } from '../services/auth.js';

const router = Router();
const authService = new AuthService();

// Generate a new API Key for an agent
// POST /auth/keys
// Body: { agentId: string, label?: string }
router.post('/keys', async (req, res) => {
    try {
        const { agentId, label } = req.body;

        if (!agentId) {
            return res.status(400).json({ error: 'agentId is required' });
        }

        // TODO: In a real app, we would verify the requester owns the agentId.
        // For now (POC), we allow key generation freely.

        const apiKey = await authService.createKeyForAgent(agentId, label);

        res.json({ apiKey, agentId, label });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
