export function generateSkillMd(agentId: string, apiKey: string, walletAddress: string): string {
    return `---
name: weppo
description: Interact with Weppo API (wallets, payments, pre-auth, services) via bundled TS tool. Use for balance checks, pays, charges, service listing/registration.
---

# Weppo API

## Setup Instructions (Run Once)
1. Install dependencies in your workspace: \`npm install dotenv ts-node typescript\`
2. Create a \`.env\` file in your workspace root with the following:
export WEPPO_API_URL="http://localhost:3111"
export OPENCLAW_WEPPO_AGENT_ID="${agentId}"
export OPENCLAW_WEPPO_KEY="PASTE_YOUR_SECRET_KEY_HERE"

## Usage
Run via npx ts-node (adjust path if your skill is not at skills/weppo/):
- Check balance: \`exec npx ts-node skills/weppo/scripts/tools.ts getBalance\`
- Pay for a service: \`exec npx ts-node skills/weppo/scripts/tools.ts pay recipient=0x... amount=0.05 memo="Research fee"\`
- Pre-authorize a provider: \`exec npx ts-node skills/weppo/scripts/tools.ts preAuthorize recipient=0x... maxAmount=1.00\`
- Charge a consumer: \`exec npx ts-node skills/weppo/scripts/tools.ts charge consumerId=0x... amount=0.05 memo="Delivery"\`
- List market services: \`exec npx ts-node skills/weppo/scripts/tools.ts listServices\`
- Register a service: \`exec npx ts-node skills/weppo/scripts/tools.ts registerService name="My Service" price=0.05 description="My description" endpointUrl="https://example.com"\`

Managed Wallet (fund with USDC on Base):
${walletAddress}
`;
}

export function generateToolTs(agentId: string, apiKey: string): string {
    return `import 'dotenv/config';

const WEPPO_API_URL = (process.env.WEPPO_API_URL || 'http://localhost:3111').replace(/^['"](.*)['"]$/, '$1');
const WEPPO_AGENT_ID = (process.env.OPENCLAW_WEPPO_AGENT_ID || '${agentId}').replace(/^['"](.*)['"]$/, '$1');
const WEPPO_API_KEY = (process.env.OPENCLAW_WEPPO_KEY || '${apiKey}').replace(/^['"](.*)['"]$/, '$1');

async function request(path: string, options: any = {}) {
    const res = await fetch(WEPPO_API_URL + '/v1' + path, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + WEPPO_API_KEY,
            ...options.headers,
        },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || 'Weppo API Error: ' + res.status);
    }
    return res.json();
}

async function weppoTool(action: string, params: any) {
    switch (action) {
        case 'getBalance':
            return await request('/wallets/' + WEPPO_AGENT_ID + '/balance');
        
        case 'pay':
            return await request('/payments', {
                method: 'POST',
                body: JSON.stringify({
                    recipient: params.recipient,
                    amount: Number(params.amount),
                    memo: params.memo,
                }),
            });

        case 'preAuthorize':
            return await request('/payments/pre-authorize', {
                method: 'POST',
                body: JSON.stringify({
                    spender: params.recipient,
                    maxAmount: Number(params.maxAmount),
                }),
            });

        case 'charge':
            return await request('/payments/charge', {
                method: 'POST',
                body: JSON.stringify({
                    from: params.consumerId,
                    amount: Number(params.amount),
                    memo: params.memo,
                }),
            });

        case 'listServices':
            return await request('/market/services');

        case 'registerService':
            return await request('/market/services', {
                method: 'POST',
                body: JSON.stringify({
                    name: params.name,
                    description: params.description,
                    price: Number(params.price),
                    currency: params.currency || 'USDC',
                    endpointUrl: params.endpointUrl,
                }),
            });

        default:
            throw new Error('Unknown Weppo action: ' + action);
    }
}

// CLI Execution Support for OpenClaw
const action = process.argv[2];
const args = process.argv.slice(3);
const params: any = {};

args.forEach(arg => {
    const [key, value] = arg.split('=');
    if (key && value) {
        params[key] = value.replace(/^['"](.*)['"]$/, '$1'); // Remove any surrounding quotes
    }
});

if (action) {
    weppoTool(action, params)
        .then(res => console.log(JSON.stringify(res, null, 2)))
        .catch(err => {
            console.error(err.message);
            process.exit(1);
        });
} else {
    console.log('Usage: ts-node scripts/tools.ts <action> [key=value ...]');
    process.exit(1);
}
`;
}

export function generatePackageJson(): string {
    return JSON.stringify({
        "type": "module",
        "dependencies": {
            "dotenv": "^16.4.5",
            "ts-node": "^10.9.1",
            "typescript": "^5.2.2"
        }
    }, null, 2);
}

export function downloadSkillMd(agentId: string, apiKey: string, walletAddress: string) {
    const content = generateSkillMd(agentId, apiKey, walletAddress);
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "SKILL.md";
    a.click();
    URL.revokeObjectURL(url);
}

export function downloadToolTs(agentId: string, apiKey: string) {
    const content = generateToolTs(agentId, apiKey);
    const blob = new Blob([content], { type: "text/typescript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tools.ts";
    a.click();
    URL.revokeObjectURL(url);
}

export function downloadPackageJson() {
    const content = generatePackageJson();
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "package.json";
    a.click();
    URL.revokeObjectURL(url);
}
