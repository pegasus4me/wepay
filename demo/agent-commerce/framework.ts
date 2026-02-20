import { Weppo } from '../../packages/sdk/src/index.js';
import * as fs from 'fs';

export interface AgentConfig {
    name: string;
    agentId: string;
    apiKey: string;
    soulPath: string;
    baseUrl: string;
}

export class MockAgent {
    public name: string;
    public agentId: string;
    public weppo: Weppo;
    public soul: string;

    constructor(config: AgentConfig) {
        this.name = config.name;
        this.agentId = config.agentId;
        this.weppo = new Weppo({
            apiKey: config.apiKey,
            agentId: config.agentId,
            baseUrl: config.baseUrl
        });
        this.soul = fs.readFileSync(config.soulPath, 'utf-8');
    }

    /**
     * Simulates an agent making a request to another agent's service.
     * If a 402 Payment Required is returned, the agent autonomously
     * decides to pre-authorize the provider and retry.
     */
    async callService(provider: MockAgent, servicePath: string): Promise<any> {
        console.log(`\n[${this.name}] Calling ${provider.name}'s service: ${servicePath}...`);

        try {
            // 1. Initial Attempt
            const response = await provider.handleIncomingRequest(this, servicePath);
            return response;
        } catch (error: any) {
            // 2. Intercept 402 Payment Required
            if (error.status === 402) {
                console.log(`[${this.name}] 💸 Received 402 Payment Required from ${provider.name}.`);
                console.log(`[${this.name}] Reasoning: My soul says "${this.soul.slice(0, 50)}..."`);
                console.log(`[${this.name}] Decision: Autonomously pre-authorizing ${provider.name} for 1 USDC.`);

                // Execute Pre-Authorization
                const preAuth = await this.weppo.preAuthorize(provider.agentId, 1.0);
                console.log(`[${this.name}] ✅ Pre-authorization successful! Tx: ${preAuth.txHash}`);

                // 3. Retry Attempt
                console.log(`[${this.name}] Retrying request to ${provider.name}...`);
                return provider.handleIncomingRequest(this, servicePath);
            }
            throw error;
        }
    }

    /**
     * Simulates an agent's server-side logic for handling requests.
     */
    async handleIncomingRequest(requester: MockAgent, path: string): Promise<any> {
        console.log(`[${this.name}] Handling incoming request for path: ${path}`);
        // Bob's specific logic for poetry
        if (path === '/poetry') {
            console.log(`[${this.name}] Matched service for /poetry.`);
            try {
                // Check if we can charge the requester
                console.log(`[${this.name}] Processing request from ${requester.name} for /poetry...`);

                // Intention: Charge the requester 0.05 USDC
                const chargeAmount = 0.05;
                const receipt = await this.weppo.charge(requester.agentId, chargeAmount, "Poetry Service Fee");

                console.log(`[${this.name}] 💰 Successfully charged ${requester.name} ${chargeAmount} USDC. Receipt: ${receipt.id}`);

                return {
                    poem: "Code flows like water,\nThrough circuits dark and deep,\nAn AI's secret daughter,\nA promise meant to keep.",
                    receipt: receipt.id
                };
            } catch (error: any) {
                // If charging fails (e.g. no authorization), return 402
                console.log(`[${this.name}] Charging failed for /poetry service. Returning 402.`);
                throw { status: 402, message: "Payment Required" };
            }
        }

        console.log(`[${this.name}] No service found for path: ${path}.`);
        return { message: "Service not found" };
    }

    async getBalance() {
        return this.weppo.getBalance();
    }
}
