"use client";

import { useState } from "react";
import { RiRobot2Line, RiWallet3Line, RiEyeLine, RiEyeOffLine, RiDownloadLine, RiFileSettingsLine } from "@remixicon/react";
import { Agent } from "../types";
import { CopyButton } from "./CopyButton";
import { downloadSkillMd, downloadToolTs } from "../utils";

export function AgentCard({ agent }: { agent: Agent }) {
    const [showAddress, setShowAddress] = useState(false);
    const short = (v: string) => `${v.slice(0, 10)}...${v.slice(-6)}`;

    return (
        <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-5 space-y-4 hover:border-neutral-700 transition-colors">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <RiRobot2Line className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-white font-mono">{agent.id}</p>
                        <p className="text-xs text-neutral-500">
                            Connected {new Date(agent.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                    </div>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-green-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Active
                </span>
            </div>

            <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between bg-neutral-950/50 rounded-lg px-3 py-2">
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

                {/* SDK Files */}
                <div className="flex items-center gap-2 pt-1">
                    <button
                        onClick={() => downloadSkillMd(agent.id, "REPLACE_WITH_YOUR_KEY", agent.wallet_address)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-medium text-neutral-400 hover:text-white bg-white/5 hover:bg-neutral-800 border border-white/10 rounded-lg transition-colors group"
                        title="Download SKILL.md for OpenClaw"
                    >
                        <RiDownloadLine className="w-3 h-3 text-neutral-500 group-hover:text-white" />
                        SKILL.md
                    </button>
                    <button
                        onClick={() => downloadToolTs(agent.id, "REPLACE_WITH_YOUR_KEY")}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-medium text-neutral-400 hover:text-white bg-white/5 hover:bg-neutral-800 border border-white/10 rounded-lg transition-colors group"
                        title="Download weppo-tool.ts"
                    >
                        <RiFileSettingsLine className="w-3 h-3 text-neutral-500 group-hover:text-white" />
                        Tool.ts
                    </button>
                </div>
            </div>
        </div>
    );
}
