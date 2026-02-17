export declare class PaymentService {
    private account;
    private publicClient;
    private walletClient;
    executePayment(recipient: string, amount: number): Promise<{
        hash: string;
        gasUsed: bigint;
        effectiveGasPrice: bigint;
    }>;
    getExplorerUrl(hash: string): string;
}
