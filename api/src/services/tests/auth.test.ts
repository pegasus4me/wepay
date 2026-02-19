import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService } from '../auth.js';

// Mock database
const mocks = vi.hoisted(() => {
    return {
        prepare: vi.fn(),
        run: vi.fn(),
        get: vi.fn()
    };
});

vi.mock('../db.js', () => ({
    default: {
        prepare: mocks.prepare
    }
}));

describe('AuthService', () => {
    let service: AuthService;

    beforeEach(() => {
        service = new AuthService();
        mocks.prepare.mockReturnValue({
            run: mocks.run,
            get: mocks.get
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('generateApiKey', () => {
        it('should generate a key with correct prefix and length', () => {
            const key = service.generateApiKey();
            expect(key.startsWith('sk_live_')).toBe(true);
            expect(key.length).toBeGreaterThan(20);
        });
    });

    describe('hashKey', () => {
        it('should return a SHA-256 hash', () => {
            const key = 'sk_live_test';
            const hash = service.hashKey(key);
            expect(hash).toHaveLength(64); // SHA-256 is 64 hex chars
        });

        it('should be deterministic', () => {
            const key = 'sk_live_test';
            const hash1 = service.hashKey(key);
            const hash2 = service.hashKey(key);
            expect(hash1).toBe(hash2);
        });
    });

    describe('createKeyForAgent', () => {
        it('should generate, hash, and store a key', () => {
            const agentId = 'agent_123';
            const apiKey = service.createKeyForAgent(agentId, 'test-key');

            expect(apiKey).toBeDefined();
            expect(mocks.prepare).toHaveBeenCalledWith('INSERT INTO api_keys (key_hash, agent_id, label) VALUES (?, ?, ?)');
            expect(mocks.run).toHaveBeenCalledWith(expect.any(String), agentId, 'test-key');
        });
    });

    describe('validateKey', () => {
        it('should return agentId for valid key', () => {
            const agentId = 'agent_123';
            mocks.get.mockReturnValue({ agent_id: agentId });

            const result = service.validateKey('sk_live_valid');
            expect(result).toBe(agentId);
            expect(mocks.prepare).toHaveBeenCalledWith('SELECT agent_id FROM api_keys WHERE key_hash = ?');
        });

        it('should return null for invalid key', () => {
            mocks.get.mockReturnValue(undefined);

            const result = service.validateKey('sk_live_invalid');
            expect(result).toBeNull();
        });
    });
});
