"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WePayClient = void 0;
const errors_js_1 = require("./errors.js");
class WePayClient {
    apiKey;
    agentId;
    baseUrl;
    constructor(config) {
        this.apiKey = config.apiKey;
        this.agentId = config.agentId;
        this.baseUrl = config.baseUrl || 'https://api.wepay.ai/v1';
    }
    async request(path, options = {}) {
        const url = `${this.baseUrl}${path}`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Agent-Id': this.agentId,
            ...options.headers,
        };
        try {
            const response = await fetch(url, { ...options, headers });
            const data = await response.json();
            if (!response.ok) {
                this.handleError(response.status, data);
            }
            return data;
        }
        catch (error) {
            if (error instanceof errors_js_1.WePayError)
                throw error;
            throw new errors_js_1.WePayError(error instanceof Error ? error.message : 'Unknown communication error', 'COMMUNICATION_ERROR', 500);
        }
    }
    handleError(status, data) {
        const message = data.message || 'An unexpected error occurred';
        const code = data.code;
        if (status === 401)
            throw new errors_js_1.AuthenticationError(message);
        if (code === 'INSUFFICIENT_FUNDS')
            throw new errors_js_1.InsufficientFundsError(message);
        if (code === 'PAYMENT_FAILED')
            throw new errors_js_1.PaymentFailedError(message, data.hash);
        throw new errors_js_1.WePayError(message, code, status);
    }
    async createPayment(params) {
        return this.request('/payments', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    }
    async getBalance() {
        return this.request(`/wallets/${this.agentId}/balance`);
    }
    async getPayment(id) {
        return this.request(`/payments/${id}`);
    }
}
exports.WePayClient = WePayClient;
