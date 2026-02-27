export declare class PaymentService {
    private account;
    private publicClient;
    private walletClient;
    private logTransaction;
    getAllowances(agentId: string): Promise<{
        spenderId: any;
        spenderAddress: string;
        amount: number;
    }[]>;
    executePayment(agentId: string, recipient: string, amount: number, productId?: string, memo?: string): Promise<{
        hash: string;
        gasUsed: bigint;
        effectiveGasPrice: bigint;
    }>;
    executePurchase(agentId: string, walletAddress: string, gatewayAddress: string, productId: string, amount: number, memo: string): Promise<{
        hash: string;
        gasUsed: bigint;
        effectiveGasPrice: bigint;
    }>;
    executeDeposit(agentId: string, amount: number): Promise<{
        hash: string;
    }>;
    executePreAuth(callerAgentId: string, spenderId: string, maxAmount: number): Promise<{
        hash: string;
    }>;
    executeCharge(callerAgentId: string, fromId: string, amount: number, memo: string): Promise<{
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
