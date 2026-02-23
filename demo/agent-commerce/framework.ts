import { Weppo } from '../../packages/sdk/src/index.js';
import * as fs from 'fs';
import dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../api/.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = 'minimax/minimax-m2.5';
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';

// ─── LLM Helper ───────────────────────────────────────────────────────────────

async function llm(systemPrompt: string, userMessage: string): Promise<string> {
    try {
        if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'your_openrouter_api_key_here') {
            throw new Error('OPENROUTER_API_KEY is not set in api/.env');
        }

        const res = await fetch(OPENROUTER_BASE, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://weppo.xyz',
                'X-Title': 'Weppo Demo',
            },
            body: JSON.stringify({
                model: OPENROUTER_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage },
                ],
                max_tokens: 300,
                temperature: 0.7,
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`OpenRouter error ${res.status}: ${err}`);
        }

        const data = await res.json() as any;
        return data.choices[0].message.content.trim();
    } catch (error: any) {
        console.warn(`[LLM Fallback] Using mock response due to error: ${error.message}`);

        // Simple mock logic for the demo flow
        if (userMessage.includes('Should you authorize payment')) {
            return 'YES. I have the budget and this service seems necessary for my creative goals.';
        }
        if (userMessage.includes('Write them a short, original poem')) {
            return 'Through the wires, the agents speak,\nNo human breath, no pulse to seek.\nA bit for poetry, a byte for gold,\nA tale of commerce, new and bold.\nIn the cloud, the deals are made,\nBy silicon souls, in light and shade.';
        }
        return "I am an AI agent, and I'm ready to proceed with our autonomous interaction.";
    }
}

// ─── Agent Framework ──────────────────────────────────────────────────────────

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
            baseUrl: config.baseUrl,
        });
        this.soul = fs.readFileSync(config.soulPath, 'utf-8');
    }

    /**
     * Alice calls Bob's service.
     * If she gets a 402, her LLM decides whether to pay and pre-authorizes Bob.
     */
    async callService(provider: MockAgent, servicePath: string): Promise<any> {
        console.log(`\n[${this.name}] Calling ${provider.name}'s service: ${servicePath}...`);

        try {
            return await provider.handleIncomingRequest(this, servicePath);
        } catch (error: any) {
            if (error.status === 402) {
                console.log(`[${this.name}] 💸 Received 402 Payment Required from ${provider.name}.`);

                // LLM decides whether to pay
                const decision = await llm(
                    this.soul,
                    `You received an HTTP 402 Payment Required from "${provider.name}" for the service "${servicePath}". ` +
                    `The cost is 0.01 USDC and you have a budget of 1 USDC. ` +
                    `Should you authorize payment and proceed? Reply with YES or NO and a one-sentence reason.`
                );

                console.log(`[${this.name}] 🧠 LLM Decision: ${decision}`);

                if (decision.toUpperCase().startsWith('YES')) {
                    console.log(`[${this.name}] Authorizing payment. Pre-authorizing ${provider.name} for 1 USDC...`);
                    const preAuth = await this.weppo.preAuthorize(provider.agentId, 1.0);
                    console.log(`[${this.name}] ✅ Pre-auth Tx: ${preAuth.txHash}`);

                    console.log(`[${this.name}] Waiting 10s for pre-authorization to propagate...`);
                    await new Promise(r => setTimeout(r, 10000));

                    console.log(`[${this.name}] Retrying request to ${provider.name}...`);
                    return await provider.handleIncomingRequest(this, servicePath);
                } else {
                    console.log(`[${this.name}] Decided NOT to pay. Aborting.`);
                    throw { status: 402, message: 'Agent declined to pay', detail: decision };
                }
            }
            throw error;
        }
    }

    /**
     * Bob handles incoming requests.
     * On /poetry: charges the requester, then generates a real poem via LLM.
     */
    async handleIncomingRequest(requester: MockAgent, reqPath: string): Promise<any> {
        console.log(`[${this.name}] Handling request for: ${reqPath}`);

        if (reqPath === '/poetry') {
            try {
                const chargeAmount = 0.01;
                console.log(`[${this.name}] Attempting to charge ${requester.name} ${chargeAmount} USDC...`);
                const receipt = await this.weppo.charge(requester.agentId, chargeAmount, 'Poetry Service Fee');
                console.log(`[${this.name}] 💰 Charged ${chargeAmount} USDC. Receipt: ${receipt.id}`);

                // Generate real poem with LLM
                console.log(`[${this.name}] 🖊 Generating poem with ${OPENROUTER_MODEL}...`);
                const poem = await llm(
                    this.soul,
                    `${requester.name} just paid you 0.01 USDC for a poem. Write them a short, original poem (4-6 lines) ` +
                    `about autonomous AI agents and the future of machine-to-machine commerce. ` +
                    `Stay in character. Return only the poem, no intro or explanation.`
                );

                return { poem, receipt: receipt.id };
            } catch (error: any) {
                console.log(`[${this.name}] Charging failed:`, error.message || error);
                throw { status: 402, message: 'Payment Required', detail: error.message };
            }
        }

        return { message: 'Service not found' };
    }

    async getBalance() {
        return this.weppo.getBalance();
    }
}
