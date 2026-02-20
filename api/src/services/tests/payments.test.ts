import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import paymentRoutes from './payments.js';

// Mock PaymentService
const mocks = vi.hoisted(() => {
    return {
        executePayment: vi.fn(),
        executePreAuth: vi.fn(),
        executeCharge: vi.fn(),
    };
});

vi.mock('../services/payment.js', () => {
    return {
        PaymentService: class {
            executePayment = mocks.executePayment;
            executePreAuth = mocks.executePreAuth;
            executeCharge = mocks.executeCharge;
        }
    };
});

// Mock PaymasterService
vi.mock('../services/paymaster.js', () => {
    return {
        PaymasterService: class {
            trackSponsorship = vi.fn();
        }
    };
});

const app = express();
app.use(express.json());
app.use('/v1/payments', paymentRoutes);

describe('Payment Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /v1/payments', () => {
        it('should create a payment', async () => {
            mocks.executePayment.mockResolvedValue({
                hash: '0xHash',
                gasUsed: 100n,
                effectiveGasPrice: 200n
            });

            const response = await request(app)
                .post('/v1/payments')
                .send({ recipient: '0xRecipient', amount: 10 });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                status: 'confirmed',
                hash: '0xHash',
                gasUsed: '100', // JSON sanitizes BigInt to string usually, or we need to handle serialization in API
                effectiveGasPrice: '200'
            });

            // Note: Express JSON serialization of BigInt might fail if not handled. 
            // In the actual code `res.json` will crash with BigInt.
            // checking `src/server.ts` or `src/routes/payments.ts`...
            // It just does `res.json({...result})`. 
            // `result` has BigInts. JSON.stringify throws on BigInt.
            // The tests might reveal this bug!
        });
    });

    describe('POST /v1/payments/pre-authorize', () => {
        it('should pre-authorize', async () => {
            mocks.executePreAuth.mockResolvedValue({ hash: '0xHash' });

            const response = await request(app)
                .post('/v1/payments/pre-authorize')
                .send({ spender: '0xSpender', maxAmount: 100 });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                status: 'confirmed',
                txHash: '0xHash'
            });
        });
    });

    describe('POST /v1/payments/charge', () => {
        it('should execute a charge', async () => {
            mocks.executeCharge.mockResolvedValue({
                hash: '0xHash',
                gasUsed: 100n,
                effectiveGasPrice: 200n
            });

            const response = await request(app)
                .post('/v1/payments/charge')
                .send({ from: '0xFrom', amount: 5, memo: 'Test' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                status: 'confirmed',
                hash: '0xHash',
                gasUsed: '100',
                effectiveGasPrice: '200'
            });
        });
    });
});
