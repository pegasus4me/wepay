import { describe, it, expect } from 'vitest';
import { parse402Header, formatWeppoAuth } from './x402';

describe('x402 Utilities', () => {
    describe('parse402Header', () => {
        it('should return null for invalid headers', () => {
            expect(parse402Header('')).toBeNull();
            expect(parse402Header('Basic xyz')).toBeNull();
        });

        it('should parse a valid Weppo header', () => {
            const header = 'Weppo realm="AgentService", amount="0.5", currency="USDC", recipient="agent_B"';
            const result = parse402Header(header);

            expect(result).toEqual({
                realm: 'AgentService',
                amount: 0.5,
                currency: 'USDC',
                recipient: 'agent_B'
            });
        });

        it('should parse additional fields like invoiceId', () => {
            const header = 'Weppo invoiceId="inv_123", token="abc"';
            const result = parse402Header(header);

            expect(result).toEqual({
                invoiceId: 'inv_123',
                token: 'abc'
            });
        });
    });

    describe('formatWeppoAuth', () => {
        it('should format the auth header correctly', () => {
            expect(formatWeppoAuth('pay_123')).toBe('Weppo pay_123');
        });
    });
});
