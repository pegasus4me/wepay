"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentFailedError = exports.AuthenticationError = exports.InsufficientFundsError = exports.WePayError = void 0;
class WePayError extends Error {
    code;
    status;
    constructor(message, code, status) {
        super(message);
        this.code = code;
        this.status = status;
        this.name = 'WePayError';
    }
}
exports.WePayError = WePayError;
class InsufficientFundsError extends WePayError {
    constructor(message = 'Wallet has insufficient funds for this payment') {
        super(message, 'INSUFFICIENT_FUNDS', 400);
        this.name = 'InsufficientFundsError';
    }
}
exports.InsufficientFundsError = InsufficientFundsError;
class AuthenticationError extends WePayError {
    constructor(message = 'Invalid API key or agent ID') {
        super(message, 'AUTHENTICATION_FAILED', 401);
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
class PaymentFailedError extends WePayError {
    hash;
    constructor(message, hash) {
        super(message, 'PAYMENT_FAILED', 500);
        this.hash = hash;
        this.name = 'PaymentFailedError';
    }
}
exports.PaymentFailedError = PaymentFailedError;
