import express from 'express';
import { Weppo, weppoPaymentMiddleware } from './packages/sdk/src/index.js';

const app = express();
app.use(express.json());

const weppo = new Weppo({
    agentId: "tom",
    apiKey: "dummy-key",
    baseUrl: "http://localhost:3111", 
});

app.post(
    '/api/deep-analysis', 
    weppoPaymentMiddleware({
        client: (weppo as any).client,
        price: 0.50,
        memo: "Deep Analysis API Request"
    }),
    async (req, res) => {
        res.status(200).json({ data: "Success!" });
    }
);

const server = app.listen(4001, () => {
    console.log("Test server running on 4001");
});
