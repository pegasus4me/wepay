export declare class WalletService {
    private publicClient;
    getBalance(address: string): Promise<{
        amount: number;
        currency: string;
    }>;
    getAgentWallet(agentId: string): Promise<string>;
}
