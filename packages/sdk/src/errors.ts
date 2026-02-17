export class WeppoError extends Error {
    constructor(message: string, public code?: string, public status?: number) {
        super(message);
        this.name = 'WeppoError';
    }
}

export class InsufficientFundsError extends WeppoError {
    constructor(message: string = 'Wallet has insufficient funds for this payment') {
        super(message, 'INSUFFICIENT_FUNDS', 400);
        this.name = 'InsufficientFundsError';
    }
}

export class AuthenticationError extends WeppoError {
    constructor(message: string = 'Invalid API key or agent ID') {
        super(message, 'AUTHENTICATION_FAILED', 401);
        this.name = 'AuthenticationError';
    }
}

export class PaymentFailedError extends WeppoError {
    constructor(message: string, public hash?: string) {
        super(message, 'PAYMENT_FAILED', 500);
        this.name = 'PaymentFailedError';
    }
}
