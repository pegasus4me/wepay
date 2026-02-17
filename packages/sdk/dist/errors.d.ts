export declare class WePayError extends Error {
    code?: string | undefined;
    status?: number | undefined;
    constructor(message: string, code?: string | undefined, status?: number | undefined);
}
export declare class InsufficientFundsError extends WePayError {
    constructor(message?: string);
}
export declare class AuthenticationError extends WePayError {
    constructor(message?: string);
}
export declare class PaymentFailedError extends WePayError {
    hash?: string | undefined;
    constructor(message: string, hash?: string | undefined);
}
