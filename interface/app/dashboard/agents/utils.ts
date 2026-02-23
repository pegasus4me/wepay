export function generateSkillMd(agentId: string, apiKey: string, walletAddress: string): string {
    return `---
name: weppo
description: Use when you need to make or receive payments, authorize spending, charge consumers, or check your USDC balance via the Weppo x402 monetization layer on Base.
---

# Weppo Payment Actions

## Overview

Use \`weppo\` to pay for external services, pre-authorize spending limits, charge other agents, and manage your USDC balance on Base. All transactions are gasless and settled on-chain.

## Configuration

These credentials are injected into your agent's environment:

\`\`\`env
OPENCLAW_WEPPO_AGENT_ID="${agentId}"
OPENCLAW_WEPPO_KEY="${apiKey}"
WEPPO_WALLET="${walletAddress}"
WEPPO_API_URL="http://localhost:3111"
\`\`\`

## Actions

### Check balance

\`\`\`json
{ "action": "getBalance" }
\`\`\`

### Pay for a service (x402 response)

\`\`\`json
{
  "action": "pay",
  "amount": 0.05,
  "recipient": "provider-agent-id",
  "memo": "Research task fee"
}
\`\`\`

### Pre-authorize a service provider

\`\`\`json
{
  "action": "preAuthorize",
  "recipient": "provider-agent-id",
  "maxAmount": 1.00
}
\`\`\`

### Charge a consumer agent (as provider)

\`\`\`json
{
  "action": "charge",
  "consumerId": "consumer-agent-id",
  "amount": 0.05,
  "memo": "Service delivery"
}
\`\`\`

### List market services

\`\`\`json
{ "action": "listServices" }
\`\`\`

### Register a service

\`\`\`json
{
  "action": "registerService",
  "name": "My Service",
  "description": "What it does",
  "price": 0.05,
  "currency": "USDC",
  "endpointUrl": "https://my-agent.com/service"
}
\`\`\`

## Ideas to try

- Check your balance before each task to ensure sufficient funds.
- Pre-authorize a provider at startup to avoid 402 interruptions mid-task.
- Charge consumers automatically after delivering a result.
`;
}

export function generateToolTs(agentId: string, apiKey: string): string {
    return `import { config } from 'clawdbot';

const WEPPO_API_URL = process.env.WEPPO_API_URL || 'http://localhost:3111';
const WEPPO_AGENT_ID = process.env.OPENCLAW_WEPPO_AGENT_ID || '${agentId}';
const WEPPO_API_KEY = process.env.OPENCLAW_WEPPO_KEY || '${apiKey}';

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

export default async function weppoTool(action: string, params: any) {
    switch (action) {
        case 'getBalance':
            return await request('/wallets/' + WEPPO_AGENT_ID + '/balance');
        
        case 'pay':
            return await request('/payments', {
                method: 'POST',
                body: JSON.stringify({
                    recipient: params.recipient,
                    amount: params.amount,
                    memo: params.memo,
                }),
            });

        case 'preAuthorize':
            return await request('/payments/pre-authorize', {
                method: 'POST',
                body: JSON.stringify({
                    spender: params.recipient,
                    maxAmount: params.maxAmount,
                }),
            });

        case 'charge':
            return await request('/payments/charge', {
                method: 'POST',
                body: JSON.stringify({
                    from: params.consumerId,
                    amount: params.amount,
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
                    price: params.price,
                    currency: params.currency || 'USDC',
                    endpointUrl: params.endpointUrl,
                }),
            });

        default:
            throw new Error('Unknown Weppo action: ' + action);
    }
}
`;
}

export function downloadSkillMd(agentId: string, apiKey: string, walletAddress: string) {
    const content = generateSkillMd(agentId, apiKey, walletAddress);
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "weppo-skill.md";
    a.click();
    URL.revokeObjectURL(url);
}

export function downloadToolTs(agentId: string, apiKey: string) {
    const content = generateToolTs(agentId, apiKey);
    const blob = new Blob([content], { type: "text/typescript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "weppo-tool.ts";
    a.click();
    URL.revokeObjectURL(url);
}
