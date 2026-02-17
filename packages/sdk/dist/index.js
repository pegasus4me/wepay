"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WePay = void 0;
const client_js_1 = require("./client.js");
__exportStar(require("./types.js"), exports);
__exportStar(require("./errors.js"), exports);
/**
 * WePay: The Consumer Abstraction Layer for Autonomous AI Agent Payments
 */
class WePay {
    client;
    constructor(config) {
        if (!config.apiKey)
            throw new Error('WePay API Key is required');
        if (!config.agentId)
            throw new Error('Agent ID is required');
        this.client = new client_js_1.WePayClient(config);
    }
    /**
     * Execute a payment. The agent does not need to handle wallets or keys.
     */
    async pay(params) {
        console.log(`[WePay] Initiating payment of ${params.amount} ${params.currency} to ${params.to}`);
        const response = await this.client.createPayment(params);
        console.log(`[WePay] Payment settled. ID: ${response.id}, Status: ${response.status}`);
        return response;
    }
    /**
     * Check the agent's available balance.
     */
    async getBalance() {
        return this.client.getBalance();
    }
    /**
     * Get historical details of a payment.
     */
    async getPaymentDetails(paymentId) {
        return this.client.getPayment(paymentId);
    }
}
exports.WePay = WePay;
