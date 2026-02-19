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
exports.Weppo = void 0;
const client_js_1 = require("./client.js");
__exportStar(require("./types.js"), exports);
__exportStar(require("./errors.js"), exports);
__exportStar(require("./x402.js"), exports);
/**
 * Weppo: The Consumer Abstraction Layer for Autonomous AI Agent Payments
 */
class Weppo {
    client;
    constructor(config) {
        if (!config.apiKey)
            throw new Error('Weppo API Key is required');
        if (!config.agentId)
            throw new Error('Agent ID is required');
        this.client = new client_js_1.WeppoClient(config);
    }
    /**
     * Payments: Direct P2P transfers
     */
    async pay(recipient, amount) {
        return this.client.createPayment({
            to: recipient,
            amount,
            currency: 'USDC' // Default for now
        });
    }
    async preAuthorize(spender, maxAmount) {
        return this.client.preAuthorize({ spender, maxAmount });
    }
    async charge(from, amount, memo) {
        return this.client.charge({ from, amount, memo });
    }
    async getBalance() {
        return this.client.getBalance();
    }
    /**
     * Market: Service Discovery
     */
    market = {
        /**
         * List available agent services.
         */
        list: async () => {
            return this.client.listServices();
        },
        /**
         * Register a new service.
         */
        register: async (params) => {
            return this.client.createService(params);
        }
    };
    /**
     * Payment Intents: x402 Payment Requests
     */
    paymentIntent = {
        /**
         * Create a new Payment Intent.
         */
        create: async (params) => {
            return this.client.createPaymentIntent(params);
        },
        /**
         * Get status of a Payment Intent.
         */
        get: async (id) => {
            return this.client.getPaymentIntent(id);
        }
    };
}
exports.Weppo = Weppo;
