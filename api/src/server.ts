import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import paymentRoutes from './routes/payments.js';
import walletRoutes from './routes/wallets.js';
import marketRoutes from './routes/market.js';
import invoiceRoutes from './routes/invoices.js';

const app = express();

app.use(cors());
app.use(express.json());

// Auth middleware for the POC
app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // We'll be lenient for the POC but log it
        // return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
