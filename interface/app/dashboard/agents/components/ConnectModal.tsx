"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    RiCloseLine,
    RiArrowRightLine,
    RiLoader4Line,
    RiCheckLine,
    RiDownloadLine,
} from "@remixicon/react";
import { Agent, Framework, ModalStep, Credentials } from "../types";
import { FRAMEWORKS } from "../constants";
import { downloadSkillMd, downloadToolTs, downloadPackageJson } from "../utils";
import { CopyButton } from "./CopyButton";

export function ConnectModal({
    onClose,
    onConnected,
}: {
    onClose: () => void;
    onConnected: (agent: Agent) => void;
}) {
    const [step, setStep] = useState<ModalStep>("framework");
    const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null);
    const [agentId, setAgentId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [credentials, setCredentials] = useState<Credentials | null>(null);

    const handleConnect = async () => {
        if (!agentId.trim()) return;
        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const res = await fetch("http://localhost:3111/auth/key", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agentId: agentId.trim(),
                    label: selectedFramework?.name || "custom",
                    userId: user.id,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to connect agent");
            }

            const data = await res.json();
            setCredentials({ apiKey: data.apiKey, walletAddress: data.walletAddress, agentId: agentId.trim() });
            setStep("credentials");

            // Optimistically add to list
            onConnected({
                id: agentId.trim(),
                wallet_address: data.walletAddress,
                created_at: new Date().toISOString(),
                user_id: user.id,
            });
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
                    <h2 className="text-sm font-semibold text-white">Connect Agent</h2>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
                        <RiCloseLine className="w-5 h-5" />
                    </button>
                </div>

                {/* Step: Framework */}
                {step === "framework" && (
                    <div className="p-6 space-y-4">
                        <p className="text-sm text-neutral-400">Select the framework your agent is built on.</p>
                        <div className="grid grid-cols-2 gap-2">
                            {FRAMEWORKS.map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setSelectedFramework(f)}
                                    className={`text-left p-3 rounded-xl border transition-colors ${selectedFramework?.id === f.id
                                        ? "border-white/30 bg-white/5"
                                        : "border-neutral-800 hover:border-neutral-700"
                                        }`}
                                >
                                    <p className="text-sm font-medium text-white">{f.name}</p>
                                    <p className="text-xs text-neutral-500 mt-0.5">{f.description}</p>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setStep("identity")}
                            disabled={!selectedFramework}
                            className="w-full flex items-center justify-center gap-2 bg-white text-black text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40 hover:bg-neutral-100 transition-colors"
                        >
                            Next <RiArrowRightLine className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Step: Agent Identity */}
                {step === "identity" && (
                    <div className="p-6 space-y-4">
                        <div>
                            <p className="text-sm text-neutral-200 font-medium">Name your agent</p>
                            <p className="text-xs text-neutral-500 mt-1">
                                This is your agent's unique ID within Weppo. Use a descriptive slug.
                            </p>
                        </div>
                        <div>
                            <input
                                value={agentId}
                                onChange={(e) => setAgentId(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                                placeholder={`openclaw-researcher-1`}
                                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 font-mono transition-colors"
                            />
                            <p className="text-xs text-neutral-600 mt-1.5">e.g. openclaw-researcher-1, my-gpt-bot</p>
                        </div>
                        {error && (
                            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
                        )}
                        <div className="flex gap-2">
                            <button onClick={() => setStep("framework")} className="flex-1 text-sm text-neutral-400 hover:text-white border border-neutral-800 py-2.5 rounded-xl transition-colors">
                                Back
                            </button>
                            <button
                                onClick={handleConnect}
                                disabled={!agentId.trim() || loading}
                                className="flex-1 flex items-center justify-center gap-2 bg-white text-black text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40 hover:bg-neutral-100 transition-colors"
                            >
                                {loading ? <RiLoader4Line className="w-4 h-4 animate-spin" /> : "Connect"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step: Credentials */}
                {step === "credentials" && credentials && (
                    <div className="p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                                <RiCheckLine className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                                <p className="text-white text-sm font-semibold">Agent connected!</p>
                                <p className="text-neutral-500 text-xs">Add these to your agent's environment.</p>
                            </div>
                        </div>

                        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3 font-mono text-xs">
                            <div className="space-y-1">
                                <p className="text-neutral-500"># Agent Identity</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-white/80">{selectedFramework?.envAgentId}=<span className="text-green-400">"{credentials.agentId}"</span></p>
                                    <CopyButton value={credentials.agentId} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-neutral-500"># Secret Key (save now — won't show again)</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-white/80 truncate mr-2">{selectedFramework?.envKey}=<span className="text-yellow-400">"{credentials.apiKey}"</span></p>
                                    <CopyButton value={credentials.apiKey} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-neutral-500"># Managed Wallet (fund with USDC on Base)</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-neutral-400 truncate mr-2">{credentials.walletAddress}</p>
                                    <CopyButton value={credentials.walletAddress} />
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-amber-500/80 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
                            ⚠ This API key will not be shown again. Copy it before closing.
                        </p>

                        {/* OpenClaw SDK download */}
                        {selectedFramework?.id === "openclaw" && (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => downloadSkillMd(credentials.agentId, credentials.apiKey, credentials.walletAddress)}
                                        className="flex-1 flex items-center justify-center gap-2 text-xs text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 py-2 rounded-xl transition-colors"
                                    >
                                        <RiDownloadLine className="w-4 h-4" />
                                        SKILL.md
                                    </button>
                                    <button
                                        onClick={() => downloadToolTs(credentials.agentId, credentials.apiKey)}
                                        className="flex-1 flex items-center justify-center gap-2 text-xs text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 py-2 rounded-xl transition-colors"
                                    >
                                        <RiDownloadLine className="w-4 h-4" />
                                        tools.ts
                                    </button>
                                </div>
                                <button
                                    onClick={() => downloadPackageJson()}
                                    className="w-full flex items-center justify-center gap-2 text-xs text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 py-2 rounded-xl transition-colors"
                                >
                                    <RiDownloadLine className="w-4 h-4" />
                                    package.json
                                </button>
                            </div>
                        )}

                        <button onClick={onClose} className="w-full text-sm text-neutral-400 hover:text-white border border-neutral-800 py-2.5 rounded-xl transition-colors">
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
