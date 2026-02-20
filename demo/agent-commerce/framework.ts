import { Weppo } from '../../packages/sdk/src/index.js';
import fs from 'fs';

/**
 * A mockup of an AI Agent Framework (e.g., Langchain, Eliza, etc.)
 * Notice how it takes a 'soul' (persona definition) and optionally integrates 
 * Weppo for default monetization layers.
 */
export class MockAgent {
    public weppo?: Weppo;
    public soul: any;

    constructor(soulFile: string, weppoConfig?: { apiKey: string, agentId: string, baseUrl: string }) {
        this.soul = JSON.parse(fs.readFileSync(soulFile, 'utf8'));

        if (weppoConfig) {
            this.weppo = new Weppo(weppoConfig);
        }
    }

    /**
     * Simulate the Agent "thinking" and generating a response based on its persona
     */
    async generateResponse(instruction: string): Promise<string> {
        return `[LLM SIMULATION - ${this.soul.name}]: Processing "${instruction}" with persona: ${this.soul.description}`;
    }

    /**
     * Helper to show the agent has a wallet via Weppo
     */
    async logWalletStatus() {
        if (!this.weppo) {
            console.log(`[${this.soul.name}] ❌ No monetization layer attached.`);
            return;
        }

        try {
            const balance = await this.weppo.getBalance();
            console.log(`[${this.soul.name}] 💰 Initializing with Wallet: ${balance.walletAddress.slice(0, 6)}...${balance.walletAddress.slice(-4)}`);
            console.log(`[${this.soul.name}] 🏦 Balance: ${balance.amount} ${balance.currency}`);
        } catch (e) {
            console.log(`[${this.soul.name}] ⚠️ Failed to fetch wallet status. (Is the API running?)`);
        }
    }
}
