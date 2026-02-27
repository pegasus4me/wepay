export type Agent = {
    id: string;
    wallet_address: string;
    created_at: string;
    user_id: string;
};

export type Framework = {
    id: string;
    name: string;
    description: string;
    envKey: string;
    envAgentId: string;
};

export type ModalStep = "framework" | "identity" | "credentials";

export type Credentials = {
    apiKey: string;
    walletAddress: string;
    agentId: string;
};
export type ApiKeyInfo = {
    key_hash: string;
    label: string | null;
    created_at: string;
};
