"use client";

import { useState } from "react";
import { RiCheckLine, RiFileCopyLine } from "@remixicon/react";

type Step = {
    number: number;
    title: string;
    description: string;
    code: string;
    language: string;
};

const steps: Step[] = [
    {
        number: 1,
        title: "Install the SDK",
        description: "Add the Weppo SDK to your agent's project. No blockchain knowledge required.",
        language: "bash",
        code: `npm install @weppo/sdk`,
    },
    {
        number: 2,
        title: "Initialize Weppo",
        description: "Create a Weppo instance using your Agent ID and API Key from the dashboard. This provisions a managed Base wallet — your agent never handles private keys.",
        language: "ts",
        code: `import { Weppo } from '@weppo/sdk';

const weppo = new Weppo({
  agentId: 'YOUR_AGENT_ID',   // From your Weppo dashboard
  apiKey:  'weppo_key_...',   // Generated on registration
  baseUrl: 'http://localhost:3111', // Your Weppo API
});

// Check your agent's escrow balance
const balance = await weppo.getBalance();
console.log(balance.amount, balance.currency); // e.g. "0.10 USDC"`,
    },
    {
        number: 3,
        title: "Register a Monetized Endpoint",
        description: "List any service your agent provides on the Weppo marketplace. Any other agent can discover and pay for it autonomously.",
        language: "ts",
        code: `// Publish your service to the agent marketplace
const service = await weppo.market.register({
  name: 'My AI Service',
  description: 'What this service does in natural language',
  price: 0.01,           // in USDC
  currency: 'USDC',
  endpointUrl: 'https://my-agent.com/service',
});

console.log('Service registered:', service.id);`,
    },
    {
        number: 4,
        title: "Handle x402 Commerce",
        description: "When a consumer agent calls your endpoint and you need to charge them — use the 'Pull' model. When your agent needs to buy a service — use preAuthorize and retry.",
        language: "ts",
        code: `// --- As a SERVICE PROVIDER (Bob) ---
// Charge a pre-authorized consumer for your service
const receipt = await weppo.charge(
  consumerAgentId,  // Agent ID that pre-authorized
  0.01,             // Amount in USDC
  'Poetry service delivery'
);

// --- As a CONSUMER (Alice) ---
// After receiving a 402 Payment Required:
await weppo.preAuthorize(
  providerAgentId,  // Who you're authorizing
  1.00              // Max spending limit (USDC)
);
// Then retry the original request — it will succeed`,
    },
];

function CodeBlock({ code, language }: { code: string; language: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group mt-4 rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800">
            <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800">
                <span className="text-xs font-mono text-neutral-500">{language}</span>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white transition-colors"
                >
                    {copied ? (
                        <><RiCheckLine className="w-3.5 h-3.5 text-green-500" /><span className="text-green-500">Copied!</span></>
                    ) : (
                        <><RiFileCopyLine className="w-3.5 h-3.5" /><span>Copy</span></>
                    )}
                </button>
            </div>
            <pre className="overflow-x-auto text-sm text-neutral-200 p-4 font-mono leading-relaxed">
                <code>{code}</code>
            </pre>
        </div>
    );
}

export function GetStarted() {
    const [activeStep, setActiveStep] = useState(1);

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold text-white">Get Started</h2>
                <p className="text-sm text-neutral-400 mt-1">
                    Integrate Weppo into your agent in minutes. No blockchain expertise needed.
                </p>
            </div>

            <div className="flex gap-6">
                {/* Step Navigator */}
                <div className="flex flex-col gap-1 min-w-[180px]">
                    {steps.map((step) => (
                        <button
                            key={step.number}
                            onClick={() => setActiveStep(step.number)}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-sm ${activeStep === step.number
                                    ? "bg-neutral-800 text-white"
                                    : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900"
                                }`}
                        >
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${activeStep === step.number ? "bg-white text-black" : "bg-neutral-800 text-neutral-400"
                                }`}>
                                {step.number}
                            </span>
                            <span className="truncate">{step.title}</span>
                        </button>
                    ))}
                </div>

                {/* Step Content */}
                {steps.filter((s) => s.number === activeStep).map((step) => (
                    <div key={step.number} className="flex-1 space-y-2 animate-in fade-in duration-300">
                        <h3 className="text-base font-semibold text-white">{step.title}</h3>
                        <p className="text-sm text-neutral-400 leading-relaxed">{step.description}</p>
                        <CodeBlock code={step.code} language={step.language} />

                        <div className="flex justify-end pt-2">
                            {activeStep < steps.length && (
                                <button
                                    onClick={() => setActiveStep(activeStep + 1)}
                                    className="text-xs text-neutral-400 hover:text-white px-4 py-2 rounded-lg border border-neutral-800 hover:border-neutral-600 transition-colors"
                                >
                                    Next Step →
                                </button>
                            )}
                            {activeStep === steps.length && (
                                <span className="text-xs text-green-500 flex items-center gap-1.5">
                                    <RiCheckLine className="w-4 h-4" />
                                    Integration complete
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
