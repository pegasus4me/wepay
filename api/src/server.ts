import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import paymentRoutes from './routes/payments.js';
import walletRoutes from './routes/wallets.js';
import marketRoutes from './routes/market.js';
import authRoutes from './routes/auth.js';
import { AuthService } from './services/auth.js';

const app = express();
const authService = new AuthService();

app.use(cors());
app.use(express.json());
import transactionsRoutes from './routes/transactions.js';

// Auth middleware (async — validateKey queries Supabase)
app.use(async (req, res, next) => {
    // Skip auth for health check, auth routes, and viewing public balances/transactions/dashboard management
    if (
        req.path === '/health' ||
        req.path.startsWith('/auth') ||
        req.path.startsWith('/v1/market/services') || // Allow dashboard to manage monetized endpoints
        (req.method === 'GET' && req.path.startsWith('/v1/wallets/') && req.path.endsWith('/balance')) ||
        (req.method === 'GET' && req.path.startsWith('/v1/transactions'))
    ) {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: Missing or invalid Authorization header' });
    }

    const apiKey = authHeader.split(' ')[1];
    const agentId = await authService.validateKey(apiKey);

    if (!agentId) {
        return res.status(401).json({ message: 'Unauthorized: Invalid API Key' });
    }

    (req as any).agentId = agentId;
    next();
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

import paymentIntentRoutes from './routes/payment_intents.js';

app.use('/auth', authRoutes);
app.use('/v1/payments', paymentRoutes);
app.use('/v1/wallets', walletRoutes);
app.use('/v1/market', marketRoutes);
app.use('/v1/payment-intents', paymentIntentRoutes);
app.use('/v1/transactions', transactionsRoutes);

app.listen(config.port, () => {
    console.log(`
🚀 Weppo API — The Consumer Abstraction Layer
Server running on http://localhost:${config.port}
  `);
});
