"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    RiRobot2Line,
    RiAddLine,
    RiLoader4Line,
} from "@remixicon/react";
import { Agent } from "./types";
import { AgentCard } from "./components/AgentCard";
import { ConnectModal } from "./components/ConnectModal";

export default function AgentsPage() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        async function fetchAgents() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from("agents")
                .select("id, wallet_address, created_at, user_id")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            setAgents(data || []);
            setLoading(false);
        }
        fetchAgents();
    }, []);

    const handleConnected = (agent: Agent) => {
        setAgents((prev) => [agent, ...prev]);
    };

    return (
        <div className="p-8 container mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-light text-white tracking-tight">Agents</h1>
                    <p className="text-neutral-400 mt-1 text-sm">Connect your agents to the Weppo monetization layer.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-white text-black text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-neutral-100 transition-colors"
                >
                    <RiAddLine className="w-4 h-4" />
                    Connect Agent
                </button>

            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <RiLoader4Line className="w-6 h-6 text-neutral-500 animate-spin" />
                </div>
            ) : agents.length === 0 ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-24 space-y-5 border border-dashed border-neutral-800 rounded-2xl">
                    <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                        <RiRobot2Line className="w-7 h-7 text-neutral-600" />
                    </div>
                    <div className="text-center">
                        <p className="text-white text-sm font-medium">No agents connected</p>
                        <p className="text-neutral-500 text-sm mt-1">Connect an agent to start monetizing its capabilities with x402.</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-white text-black text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-neutral-100 transition-colors"
                    >
                        <RiAddLine className="w-4 h-4" />
                        Connect your first agent
                    </button>
                </div>
            ) : (
                /* Agents Grid */
                <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-4">
                    {agents.map((agent) => (
                        <AgentCard key={agent.id} agent={agent} />
                    ))}
                </div>
            )}

            <div>
                <h2 className="text-2xl font-light text-white tracking-tight">Monetized Endpoints</h2>
            </div>
            {/* Connect Modal */}
            {showModal && (
                <ConnectModal
                    onClose={() => setShowModal(false)}
                    onConnected={handleConnected}
                />
            )}
        </div>
    );
}
