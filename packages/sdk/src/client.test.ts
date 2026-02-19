import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPublicClient } from 'viem';
import { WeppoClient } from './client';
import { WeppoConfig } from './types';
import { WeppoError, AuthenticationError } from './errors';

// Mock viem
vi.mock('viem', async () => {
    const actual = await vi.importActual('viem');
    return {
        ...actual,
        createPublicClient: vi.fn(),
        http: vi.fn(),
        encodeFunctionData: vi.fn(() => '0xencoded'),
    };
});

vi.mock('viem/accounts', () => ({
    privateKeyToAccount: vi.fn(() => ({
        address: '0xTestAccount',
        signTypedData: vi.fn(() => Promise.resolve('0xsignature')),
    })),
}));

describe('WeppoClient', () => {
    let client: WeppoClient;
    const config: WeppoConfig = {
        apiKey: 'test_api_key',
        agentId: 'test_agent_id',
        baseUrl: 'http://api.weppo.ai',
    };

    const mockFetch = vi.fn();

    beforeEach(() => {
        global.fetch = mockFetch;
        client = new WeppoClient(config);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with provided config', () => {
            expect(client).toBeInstanceOf(WeppoClient);
        });

        it('should initialize web3 components if privateKey is provided', () => {
            const web3Config = {
                ...config,
                privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234',
                forwarderAddress: '0xForwarder',
                weppoAddress: '0xWeppo',
            };
            const web3Client = new WeppoClient(web3Config);
            expect(web3Client).toBeInstanceOf(WeppoClient);
        });
    });

    describe('request', () => {
        it('should make a successful request', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ id: 'pay_123', status: 'pending' }),
            });

            const result = await client.createPayment({ amount: 10, currency: 'USDC' });
            expect(result).toEqual({ id: 'pay_123', status: 'pending' });
            expect(mockFetch).toHaveBeenCalledWith(
                'http://api.weppo.ai/payments',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test_api_key',
                        'X-Agent-Id': 'test_agent_id',
                    }),
                })
            );
        });

        it('should throw AuthenticationError on 401', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({ message: 'Unauthorized', code: 'UNAUTHORIZED' }),
            });

            await expect(client.createPayment({ amount: 10 })).rejects.toThrow(AuthenticationError);
        });

        it('should throw WeppoError on generic error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({ message: 'Server Error', code: 'INTERNAL_ERROR' }),
            });

            await expect(client.createPayment({ amount: 10 })).rejects.toThrow(WeppoError);
        });
    });

    describe('Meta-Transactions', () => {
        const web3Config = {
            ...config,
            privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234',
            forwarderAddress: '0xForwarder',
            weppoAddress: '0xWeppo',
        };
        let web3Client: WeppoClient;

        beforeEach(() => {
            // Mock publicClient.readContract for nonce
            const mockPublicClient = {
                readContract: vi.fn().mockResolvedValue(0n),
            };

            vi.mocked(createPublicClient).mockReturnValue(mockPublicClient as any);

            web3Client = new WeppoClient(web3Config);
        });

        it('should send a meta-transaction for preAuthorize', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ txHash: '0xhash', status: 'submitted' }),
            });

            const result = await web3Client.preAuthorize({ spender: 'agent_B', maxAmount: 10 });

            expect(result).toEqual({ txHash: '0xhash', status: 'submitted' });
            expect(mockFetch).toHaveBeenCalledWith(
                'http://api.weppo.ai/payments/pre-authorize-meta',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('request'), // Check that body contains signature/request
                })
            );
        });
    });
});
