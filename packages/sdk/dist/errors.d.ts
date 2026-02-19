export declare class WeppoError extends Error {
    code?: string | undefined;
    status?: number | undefined;
    constructor(message: string, code?: string | undefined, status?: number | undefined);
}
export declare class InsufficientFundsError extends WeppoError {
    constructor(message?: string);
}
export declare class AuthenticationError extends WeppoError {
    constructor(message?: string);
}
export declare class PaymentFailedError extends WeppoError {
    hash?: string | undefined;
    constructor(message: string, hash?: string | undefined);
}
