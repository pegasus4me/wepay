"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    RiAddLine,
    RiLoader4Line,
    RiMoneyDollarCircleLine,
    RiLinkM,
    RiDeleteBinLine,
} from "@remixicon/react";

interface Service {
    id: string;
    providerAgentId: string;
    name: string;
    price: number;
    currency: string;
    endpointUrl: string;
}

interface Agent {
    id: string;
}

export default function MonetizationPage() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [selectedAgent, setSelectedAgent] = useState("");
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [path, setPath] = useState("");

    useEffect(() => {
        async function loadData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Load Agents
            const { data: agentData } = await supabase
                .from("agents")
                .select("id")
                .eq("user_id", user.id);
            
            setAgents(agentData || []);
            if (agentData?.length) setSelectedAgent(agentData[0].id);

            // Load existing services
            const res = await fetch("http://localhost:3111/v1/market/services");
            if (res.ok) {
                const allServices = await res.json();
                // Filter for user's agents
                const userAgentIds = (agentData || []).map(a => a.id);
                setServices(allServices.filter((s: Service) => userAgentIds.includes(s.providerAgentId)));
            }
            setLoading(false);
        }
        loadData();
    }, []);

    const handleAddEndpoint = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch("http://localhost:3111/v1/market/services", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "x-agent-id": selectedAgent
                },
                body: JSON.stringify({
                    name,
                    price: parseFloat(price),
                    currency: "USDC",
                    endpointUrl: path
                }),
            });

            if (res.ok) {
                const newService = await res.json();
                setServices([newService, ...services]);
                setName("");
                setPrice("");
                setPath("");
            }
        } catch (e) {
            console.error("Failed to add endpoint", e);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-8 container mx-auto space-y-8 animate-in fade-in duration-700">
            <div>
                <h1 className="text-3xl font-light text-white tracking-tight">Endpoint Monetization</h1>
                <p className="text-neutral-400 mt-1 text-sm">Turn your agent's API capabilities into revenue streams with x402.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form */}
                <div className="lg:col-span-1">
                    <form onSubmit={handleAddEndpoint} className="bg-neutral-900/40 border border-neutral-800 rounded-xl p-6 space-y-4">
                        <h2 className="text-lg font-medium text-white flex items-center gap-2 mb-2">
                            <RiAddLine className="w-5 h-5" />
                            Monetize New Path
                        </h2>

                        <div>
                            <label className="block text-xs font-medium text-neutral-500 mb-1.5 uppercase">Agent</label>
                            <select 
                                value={selectedAgent}
                                onChange={(e) => setSelectedAgent(e.target.value)}
                                className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
                            >
                                {agents.map(a => <option key={a.id} value={a.id}>{a.id}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-neutral-500 mb-1.5 uppercase">Service Name</label>
                            <input 
                                type="text" 
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Deep Market Analysis"
                                className="w-full bg-black border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-neutral-500 mb-1.5 uppercase">Price (USDC)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">$</span>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    required
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="0.50"
                                    className="w-full bg-black border border-neutral-800 rounded-lg pl-7 pr-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-neutral-500 mb-1.5 uppercase">Endpoint Path</label>
                            <div className="relative">
                                <RiLinkM className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
                                <input 
                                    type="text" 
                                    required
                                    value={path}
                                    onChange={(e) => setPath(e.target.value)}
                                    placeholder="/api/v1/analyze"
                                    className="w-full bg-black border border-neutral-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-neutral-600"
                                />
                            </div>
                        </div>

                        <button 
                            disabled={submitting}
                            className="w-full bg-white text-black font-semibold py-2 rounded-lg text-sm hover:bg-neutral-200 transition-colors disabled:opacity-50"
                        >
                            {submitting ? <RiLoader4Line className="w-4 h-4 animate-spin mx-auto" /> : "Enable Monetization"}
                        </button>
                    </form>
                </div>

                {/* List */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-lg font-medium text-white flex items-center gap-2">
                        <RiMoneyDollarCircleLine className="w-5 h-5 text-neutral-400" />
                        Active Paywalls
                    </h2>

                    {loading ? (
                        <div className="p-12 text-center bg-neutral-900/20 border border-neutral-800 rounded-xl">
                            <RiLoader4Line className="w-6 h-6 animate-spin mx-auto text-neutral-600" />
                        </div>
                    ) : services.length === 0 ? (
                        <div className="p-12 text-center bg-neutral-900/20 border border-dashed border-neutral-800 rounded-xl">
                            <p className="text-neutral-500 text-sm">No monetized endpoints yet.</p>
                        </div>
                    ) : (
                        <div className="bg-neutral-900/40 border border-neutral-800 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-black/40 border-b border-neutral-800 text-[10px] uppercase text-neutral-500 font-bold tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3">Agent</th>
                                        <th className="px-6 py-3">Service</th>
                                        <th className="px-6 py-3">Path</th>
                                        <th className="px-6 py-3 text-right">Price</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800">
                                    {services.map(s => (
                                        <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs text-neutral-400">{s.providerAgentId}</td>
                                            <td className="px-6 py-4 text-white font-medium">{s.name}</td>
                                            <td className="px-6 py-4 font-mono text-xs text-blue-400">{s.endpointUrl}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-white font-semibold">{s.price.toFixed(2)}</span>
                                                <span className="text-neutral-500 ml-1 text-xs">{s.currency}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
