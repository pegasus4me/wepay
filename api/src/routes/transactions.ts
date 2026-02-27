import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Get transactions for all agents owned by a user, or a specific agent
router.get('/', async (req, res) => {
    try {
        // Find agents for this user? The dashboard calls this securely, or we use a public approach for now.
        // For the POC, we can just fetch all or filter by a specific agentId if provided.
        const { agentId } = req.query;

        let query = db.from('transactions').select(`
            *,
            agents ( id )
        `).order('created_at', { ascending: false }).limit(50);

        if (agentId) {
            query = query.eq('agent_id', agentId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[API] Failed to fetch transactions:', error);
            return res.status(500).json({ error: error.message });
        }

        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
