import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from '../../routes/auth.js';

// Mock AuthService
const mocks = vi.hoisted(() => {
    return {
        createKeyForAgent: vi.fn(),
    };
});

vi.mock('../services/auth.js', () => {
    return {
        AuthService: class {
            createKeyForAgent = mocks.createKeyForAgent;
        }
    };
});

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Auth Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /auth/keys', () => {
        it('should generate a new key', async () => {
            mocks.createKeyForAgent.mockReturnValue('sk_live_test123');

            const response = await request(app)
                .post('/auth/keys')
                .send({ agentId: 'agent_123', label: 'test' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                apiKey: 'sk_live_test123',
                agentId: 'agent_123',
                label: 'test'
            });
            expect(mocks.createKeyForAgent).toHaveBeenCalledWith('agent_123', 'test');
        });

        it('should require agentId', async () => {
            const response = await request(app)
                .post('/auth/keys')
                .send({ label: 'test' });

            expect(response.status).toBe(400);
            expect(response.body).toEqual({ error: 'agentId is required' });
        });
    });
});
