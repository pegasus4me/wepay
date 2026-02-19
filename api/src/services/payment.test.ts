import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PaymentService } from './payment.js';
import { createPublicClient, createWalletClient, parseUnits } from 'viem';

// Mock viem and config
vi.mock('viem', async () => {
    const actual = await vi.importActual('viem');
    return {
        ...actual,
        createPublicClient: vi.fn(),
        createWalletClient: vi.fn(),
        http: vi.fn(),
        parseUnits: vi.fn((val) => BigInt(val) * 1000000n), // Mock USDC 6 decimals
    };
});

vi.mock('../config', () => ({
    config: {
        rpcUrl: 'http://localhost:8545',
        privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234',
        usdcAddress: '0xUSDC',
        weppoAddress: '0xWeppo',
        forwarderAddress: '0xForwarder',
    }
}));

vi.mock('viem/accounts', () => ({
    privateKeyToAccount: vi.fn(() => ({
        address: '0xTestAccount',
    })),
}));


describe('PaymentService', () => {
    let service: PaymentService;
    let mockPublicClient: any;
    let mockWalletClient: any;

    beforeEach(() => {
        mockPublicClient = {
            readContract: vi.fn().mockResolvedValue(6), // Decimals
            waitForTransactionReceipt: vi.fn().mockResolvedValue({
                gasUsed: 100000n,
                effectiveGasPrice: 2000000000n,
            }),
        };

        mockWalletClient = {
            writeContract: vi.fn().mockResolvedValue('0xHash'),
        };

        vi.mocked(createPublicClient).mockReturnValue(mockPublicClient);
        vi.mocked(createWalletClient).mockReturnValue(mockWalletClient);

        service = new PaymentService();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('executePayment', () => {
        it('should execute a payment successfully', async () => {
            const result = await service.executePayment('0xRecipient', 10);

            expect(result).toEqual({
                hash: '0xHash',
                gasUsed: 100000n,
                effectiveGasPrice: 2000000000n,
            });

            expect(mockPublicClient.readContract).toHaveBeenCalled(); // Check decimals
            expect(mockWalletClient.writeContract).toHaveBeenCalledWith(expect.objectContaining({
                functionName: 'transfer',
                args: ['0xRecipient', 10000000n],
            }));
        });
    });

    describe('executePreAuth', () => {
        it('should execute pre-authorization', async () => {
            const result = await service.executePreAuth('0xSpender', 100);

            expect(result).toEqual({ hash: '0xHash' });

            expect(mockWalletClient.writeContract).toHaveBeenCalledWith(expect.objectContaining({
                functionName: 'preAuthorize',
                args: ['0xSpender', 100000000n],
            }));
        });
    });

    describe('executeCharge', () => {
        it('should execute a charge', async () => {
            const result = await service.executeCharge('0xFrom', 5, 'Test Charge');

            expect(result).toEqual({
                hash: '0xHash',
                gasUsed: 100000n,
                effectiveGasPrice: 2000000000n,
            });

            expect(mockWalletClient.writeContract).toHaveBeenCalledWith(expect.objectContaining({
                functionName: 'charge',
                args: ['0xFrom', 5000000n, 'Test Charge'],
            }));
        });
    });
});
