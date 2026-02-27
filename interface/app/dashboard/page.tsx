"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
    RiCheckboxCircleFill,
    RiErrorWarningFill,
    RiArrowRightSLine,
    RiWallet3Line,
    RiLineChartLine,
    RiExchangeBoxLine,
    RiHandCoinLine
} from "@remixicon/react";
import Link from "next/link";
import { GetStarted } from "./(components)/getStarted";

export default function Dashboard() {
    const [isIntegrated, setIsIntegrated] = useState<boolean | null>(null);
    const [agentCount, setAgentCount] = useState(0);
    const [treasuryBalance, setTreasuryBalance] = useState<number | null>(null);
    const [transactions, setTransactions] = useState<any[]>([]);

    console.log('transactions', transactions);
    useEffect(() => {
        async function checkIntegration() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setIsIntegrated(false);
                return;
            }

            const { data: agents, count, error } = await supabase
                .from('agents')
                .select('id', { count: 'exact' })
                .eq('user_id', user.id);

            if (!error && count !== null && count > 0 && agents) {
                setIsIntegrated(true);
                setAgentCount(count);

                // Fetch balances for all agents
                let totalBalance = 0;
                await Promise.all(
                    agents.map(async (agent) => {
                        try {
                            const res = await fetch(`http://localhost:3111/v1/wallets/${agent.id}/balance`);
                            if (res.ok) {
                                const data = await res.json();
                                totalBalance += data.amount || 0;
                            }
                        } catch (e) {
                            console.error(`Failed to fetch balance for agent ${agent.id}`, e);
                        }
                    })
                );
                setTreasuryBalance(totalBalance);

                // Fetch transactions for all agents
                try {
                    const allTx = await Promise.all(
                        agents.map(async (agent) => {
                            const res = await fetch(`http://localhost:3111/v1/transactions?agentId=${agent.id}`);
                            if (res.ok) return await res.json();
                            return [];
                        })
                    );
                    const flatTx = allTx.flat().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                    setTransactions(flatTx.slice(0, 10)); // keep latest 10
                } catch (e) {
                    console.error("Failed to fetch transactions", e);
                }
            } else {
                setIsIntegrated(false);
                setTreasuryBalance(0);
            }
        }
        checkIntegration();
    }, []);

    console.log(isIntegrated);
    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-light tracking-tight text-white">Overview</h1>
                    <p className="text-neutral-400 mt-1">Monitor and manage your autonomous agent fleet.</p>
                </div>

                <div className="flex items-center gap-3  px-4 py-2 rounded-full">
                    <span className="text-xs font-medium text-neutral-300">System Status:</span>
                    {isIntegrated === null ? (
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-neutral-600 animate-pulse" />
                            <span className="text-sm text-neutral-500 italic">Checking...</span>
                        </div>
                    ) : isIntegrated ? (
                        <div className="flex items-center gap-2">
                            <RiCheckboxCircleFill className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-green-500 tracking-wide">Integrated</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <RiErrorWarningFill className="w-4 h-4 text-red-500" />
                            <span className="text-sm text-red-500 tracking-wide">not integrated</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Treasury Balance"
                    value={treasuryBalance !== null ? `${treasuryBalance.toFixed(2)} USD` : "Loading..."}
                    icon={<RiWallet3Line className="w-5 h-5" />}
                    description="Total funds across all agent wallets"
                />
                <StatCard
                    title="Monthly Revenue"
                    value="0.00 USD"
                    icon={<RiLineChartLine className="w-5 h-5" />}
                    description="MRR generated by your agents"
                />
                <StatCard
                    title="Monetized Endpoints"
                    value="0"
                    icon={<RiExchangeBoxLine className="w-5 h-5" />}
                    description="Active x402 monetization layers"
                />
                <StatCard
                    title="Total Spent"
                    value="0.00 USD"
                    icon={<RiHandCoinLine className="w-5 h-5" />}
                    description="Sub-task costs and operational expenses"
                />
            </div>



            {/* Get Started — show when not yet integrated */}
            {isIntegrated === false && (
                <div className="bg-neutral-900/30 border border-neutral-800 rounded-2xl p-6">
                    <GetStarted />
                </div>
            )}

            {/* Transaction Feed */}
            <div className="bg-neutral-900/30 overflow-hidden">
                <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
                    <h2 className="text-sm text-white">Recent Activity</h2>
                    <Link href="/dashboard/tracking" className="text-sm text-neutral-400 hover:text-white flex items-center gap-1 transition-colors">
                        View All Tracking <RiArrowRightSLine className="w-4 h-4" />
                    </Link>
                </div>
                {transactions.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                        <RiExchangeBoxLine className="w-10 h-10 text-neutral-700 mx-auto" />
                        <p className="text-neutral-500 max-w-sm mx-auto">
                            No transactions found. Once your agents start interacting, you'll see Sell/Buy logs here.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-neutral-800/50">
                        {transactions.map((tx) => (
                            <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-neutral-800/20 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
                                        <RiExchangeBoxLine className="w-5 h-5 text-neutral-400" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm text-white font-medium capitalize">{tx.type.replace('_', ' ')}</p>
                                            <span className="text-xs text-neutral-600">• {new Date(tx.created_at).toLocaleString()}</span>
                                        </div>
                                        <p className="text-xs text-neutral-500">
                                            {tx.agent_id || 'Agent'} → {tx.recipient.slice(0, 6)}...{tx.recipient.slice(-4)}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-2">
                                    <p className="text-sm text-white">{tx.amount} {tx.currency}</p>
                                    <a href={`https://sepolia.basescan.org/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300">
                                        ↗
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, description }: { title: string, value: string, icon: React.ReactNode, description: string }) {
    return (
        <div className="bg-transparent p-6  space-y-4  transition-colors shadow-sm group">
            <div>
                <p className="text-sm text-neutral-400 font-">{title}</p>
                <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl text-white">{value}</span>
                </div>
                <p className="text-xs text-neutral-500 mt-2">{description}</p>
            </div>
        </div>
    );
}