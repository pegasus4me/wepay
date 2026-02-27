export declare class WalletService {
    private publicClient;
    getBalance(address: string): Promise<{
        amount: number;
        currency: string;
    }>;
    getAgentAddress(agentId: string): Promise<string>;
    executeWithdrawal(agentId: string, toAddress: string, amount: number): Promise<{
        hash: string;
    }>;
}
