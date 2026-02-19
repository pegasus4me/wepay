export declare class PaymentService {
    private account;
    private publicClient;
    private walletClient;
    executePayment(recipient: string, amount: number): Promise<{
        hash: string;
        gasUsed: bigint;
        effectiveGasPrice: bigint;
    }>;
    executePreAuth(spender: string, maxAmount: number): Promise<{
        hash: string;
    }>;
    executeCharge(from: string, amount: number, memo: string): Promise<{
        hash: string;
        gasUsed: bigint;
        effectiveGasPrice: bigint;
    }>;
    relayTransaction(request: any): Promise<{
        hash: string;
        gasUsed: bigint;
        effectiveGasPrice: bigint;
    }>;
    getExplorerUrl(hash: string): string;
}
