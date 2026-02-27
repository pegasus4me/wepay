"use client";

import { useEffect, useState } from "react";
import {
    RiRobot2Line,
    RiWallet3Line,
    RiEyeLine,
    RiEyeOffLine,
    RiArrowDownLine,
    RiArrowUpLine,
    RiDownloadLine,
    RiFileSettingsLine,
    RiKey2Line,
    RiDeleteBinLine,
    RiAddLine,
    RiLoader4Line
} from "@remixicon/react";
import { Agent, ApiKeyInfo } from "../types";
import { CopyButton } from "./CopyButton";
import { downloadSkillMd, downloadToolTs, downloadPackageJson } from "../utils";

export function AgentCard({ agent }: { agent: Agent }) {
    const [showAddress, setShowAddress] = useState(false);
    const [showInfos, setShowInfos] = useState(false);
    const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
    const [loadingKeys, setLoadingKeys] = useState(false);
    const [creatingKey, setCreatingKey] = useState(false);
    const [revokingKey, setRevokingKey] = useState<string | null>(null);
    const [newlyCreatedKey, setNewlyCreatedKey] = useState<{ key: string, hash: string } | null>(null);

    const fetchKeys = async () => {
        setLoadingKeys(true);
        try {
            const res = await fetch(`http://localhost:3111/auth/keys/${agent.id}`);
            if (res.ok) {
                const data = await res.json();
                setKeys(data);
            }
        } catch (e) {
            console.error("Failed to fetch keys", e);
        } finally {
            setLoadingKeys(false);
        }
    };

    useEffect(() => {
        if (showInfos) {
            fetchKeys();
        }
    }, [showInfos, agent.id]);

    const handleCreateKey = async () => {
        setCreatingKey(true);
        try {
            const res = await fetch("http://localhost:3111/auth/key", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentId: agent.id, label: "api key" }),
            });
            if (res.ok) {
                const data = await res.json();
                setNewlyCreatedKey({ key: data.apiKey, hash: "" });
                fetchKeys();
            }
        } catch (e) {
            console.error("Failed to create key", e);
        } finally {
            setCreatingKey(false);
        }
    };

    const handleRevokeKey = async (hash: string) => {
        if (!confirm("Are you sure? This key will stop working immediately.")) return;
        setRevokingKey(hash);
        try {
            const res = await fetch(`http://localhost:3111/auth/keys/${agent.id}/${hash}`, {
                method: "DELETE"
            });
            if (res.ok) {
                fetchKeys();
            }
        } catch (e) {
            console.error("Failed to revoke key", e);
        } finally {
            setRevokingKey(null);
        }
    };

    const short = (v: string) => `${v.slice(0, 10)}...${v.slice(-6)}`;

    return (
        <div className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-5 space-y-4 hover:border-neutral-700 transition-colors">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <RiRobot2Line className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white font-mono">{agent.id}</p>
                            <span className="flex items-center gap-1.5 text-xs text-green-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                Active
                            </span>
                        </div>
                        <p className="text-xs text-neutral-500">
                            Connected {new Date(agent.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowInfos(!showInfos)}
                    className="text-neutral-600 hover:text-white transition-colors"
                >
                    {showInfos ? <RiArrowUpLine className="w-4 h-4" /> : <RiArrowDownLine className="w-4 h-4" />}
                </button>
            </div>

            {showInfos && (
                <div className="space-y-6 pt-1">
                    {/* Wallet Row */}
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider">Managed Wallet</p>
                        <div className="flex items-center justify-between bg-neutral-950/50 rounded-lg px-3 py-2 border border-white/5">
                            <div className="flex items-center gap-2 min-w-0">
                                <RiWallet3Line className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                                <span className="text-xs font-mono text-neutral-400 truncate">
                                    {showAddress ? agent.wallet_address : short(agent.wallet_address)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                <button
                                    onClick={() => setShowAddress(!showAddress)}
                                    className="text-neutral-600 hover:text-white transition-colors"
                                >
                                    {showAddress ? <RiEyeOffLine className="w-3.5 h-3.5" /> : <RiEyeLine className="w-3.5 h-3.5" />}
                                </button>
                                <CopyButton value={agent.wallet_address} />
                            </div>
                        </div>
                    </div>

                    {/* API Keys Management */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider">API Keys</p>
                            <button
                                onClick={handleCreateKey}
                                disabled={creatingKey}
                                className="text-[10px] flex items-center gap-1 text-green-500 hover:text-green-400 transition-colors"
                            >
                                {creatingKey ? <RiLoader4Line className="w-3 h-3 animate-spin" /> : <RiAddLine className="w-3 h-3" />}
                                Create New
                            </button>
                        </div>

                        {newlyCreatedKey && (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-2 space-y-2">
                                <p className="text-[10px] text-yellow-500 font-medium">New key created! Save it now.</p>
                                <div className="flex items-center justify-between bg-neutral-950 rounded px-2 py-1.5 border border-white/5">
                                    <span className="text-xs font-mono text-white truncate mr-2">{newlyCreatedKey.key}</span>
                                    <div className="flex items-center gap-2">
                                        <CopyButton value={newlyCreatedKey.key} />
                                        <button onClick={() => setNewlyCreatedKey(null)} className="text-neutral-500 hover:text-white">
                                            <RiArrowUpLine className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="border border-white/5 rounded-lg overflow-hidden">
                            <table className="w-full text-[11px]">
                                <thead className="bg-white/5 border-b border-white/5">
                                    <tr className="text-neutral-500 font-medium">
                                        <th className="px-3 py-2 text-left">Label</th>
                                        <th className="px-3 py-2 text-left">Hash (ID)</th>
                                        <th className="px-3 py-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {loadingKeys && keys.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-3 py-4 text-center text-neutral-600">Loading...</td>
                                        </tr>
                                    ) : keys.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-3 py-4 text-center text-neutral-600 italic">No keys found.</td>
                                        </tr>
                                    ) : (
                                        keys.map((k) => (
                                            <tr key={k.key_hash} className="group hover:bg-white/[0.02]">
                                                <td className="px-3 py-2 text-neutral-400 font-medium">{k.label || "-"}</td>
                                                <td className="px-3 py-2 text-neutral-500 font-mono italic">{k.key_hash.slice(0, 8)}...</td>
                                                <td className="px-3 py-2 text-right">
                                                    <button
                                                        onClick={() => handleRevokeKey(k.key_hash)}
                                                        disabled={revokingKey === k.key_hash}
                                                        className="text-neutral-600 hover:text-red-500 transition-colors p-1"
                                                        title="Revoke Key"
                                                    >
                                                        {revokingKey === k.key_hash ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" /> : <RiDeleteBinLine className="w-3.5 h-3.5" />}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* SDK Files */}
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider">SDK Package</p>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => downloadSkillMd(agent.id, "PASTE_YOUR_SECRET_KEY_HERE", agent.wallet_address)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-medium text-neutral-400 hover:text-white bg-white/5 hover:bg-neutral-800 border border-white/10 rounded-lg transition-colors group"
                                    title="Download SKILL.md for OpenClaw"
                                >
                                    <RiDownloadLine className="w-3 h-3 text-neutral-500 group-hover:text-white" />
                                    SKILL.md
                                </button>
                                <button
                                    onClick={() => downloadToolTs(agent.id, "PASTE_YOUR_SECRET_KEY_HERE")}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-medium text-neutral-400 hover:text-white bg-white/5 hover:bg-neutral-800 border border-white/10 rounded-lg transition-colors group"
                                    title="Download tools.ts (SDK logic)"
                                >
                                    <RiFileSettingsLine className="w-3 h-3 text-neutral-500 group-hover:text-white" />
                                    tools.ts
                                </button>
                            </div>
                            <button
                                onClick={() => downloadPackageJson()}
                                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-medium text-neutral-400 hover:text-white bg-white/5 hover:bg-neutral-800 border border-white/10 rounded-lg transition-colors group"
                                title="Download package.json with dependencies"
                            >
                                <RiDownloadLine className="w-3 h-3 text-neutral-500 group-hover:text-white" />
                                package.json
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
