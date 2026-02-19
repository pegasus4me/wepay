import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import paymentRoutes from './routes/payments.js';
import walletRoutes from './routes/wallets.js';
import marketRoutes from './routes/market.js';
import invoiceRoutes from './routes/invoices.js';
import authRoutes from './routes/auth.js';
import { AuthService } from './services/auth.js';
const app = express();
const authService = new AuthService();
app.use(cors());
app.use(express.json());
// Auth middleware
app.use((req, res, next) => {
    // Skip auth for health check and auth routes
    if (req.path === '/health' || req.path.startsWith('/auth')) {
        return next();
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: Missing or invalid Authorization header' });
    }
    const apiKey = authHeader.split(' ')[1];
    const agentId = authService.validateKey(apiKey);
    if (!agentId) {
        return res.status(401).json({ message: 'Unauthorized: Invalid API Key' });
    }
    // Attach agentId to request for downstream use (if needed)
    // (req as any).agentId = agentId;
    next();
});
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/auth', authRoutes);
app.use('/v1/payments', paymentRoutes);
app.use('/v1/wallets', walletRoutes);
app.use('/v1/market', marketRoutes);
app.use('/v1/invoices', invoiceRoutes);
app.listen(config.port, () => {
    console.log(`
🚀 Weppo API — The Consumer Abstraction Layer
Server running on http://localhost:${config.port}
  `);
});
