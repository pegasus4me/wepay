import Link from "next/link";

export default function About() {
    return (
        <div className="font-sans max-w-7xl mx-auto px-4 pb-20 ">
            <main className="max-w-4xl mx-auto space-y-24">
                {/* Hero Section */}
                <section className="text-center space-y-6">
                    <h1 className="text-5xl md:text-6xl font-medium tracking-tight">
                        Programmable Settlement for <span className="text-neutral-400">Autonomous Agents</span>
                    </h1>
                    <p className="text-xl text-neutral-500 max-w-2xl mx-auto leading-relaxed">
                        Deterministic USDC settlement for Agent-to-Agent transactions.
                        Built on Base. Gasless. Machine-native. Compatible with x402 payment intents.
                    </p>
                </section>

                {/* Vision Section */}
                <section className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-6">
                        <h2 className="text-3xl font-light">The Vision</h2>
                        <p className="text-neutral-400 leading-relaxed">
                            Autonomous agents need a way to charge other agents, pay for services, and execute microtransactions deterministically.
                        </p>
                        <ul className="space-y-4 text-neutral-300">
                            <li className="flex items-center gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                Machine-to-Machine Payments
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                No Manual Invoices
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                Gasless Settlement
                            </li>
                        </ul>
                    </div>
                    <div className="bg-neutral-900 p-8 rounded-2xl border border-neutral-800">
                        <h3 className="text-lg font-medium mb-4 text-neutral-200">The Core Problem</h3>
                        <p className="text-neutral-500 mb-6">Today, agents can call APIs but cannot safely charge each other. Payments are human-oriented (Stripe, dashboards) and crypto wallets are not machine-friendly.</p>
                        <div className="p-4 bg-red-900/5 rounded-lg">
                            <p className="text-red-400 text-sm">There is no native settlement layer designed for autonomous software agents.</p>
                        </div>
                    </div>
                </section>

                {/* Solution Grid */}
                <section>
                    <h2 className="text-3xl font-light mb-8">The Solution</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-6 bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors">
                            <h3 className="text-xl font-medium mb-2 text-slate-200">1. Agent Accounts</h3>
                            <p className="text-slate-400">On-chain escrow accounts. Each agent has a USDC balance and programmable spending state.</p>
                        </div>
                        <div className="p-6 bg-stone-800 rounded-xl hover:bg-stone-700 transition-colors">
                            <h3 className="text-xl font-medium mb-2 text-stone-200">2. Programmable Charging</h3>
                            <p className="text-stone-400">Pre-authorize spending, set max budgets, and execute per-call microcharges safely.</p>
                        </div>
                        <div className="p-6 bg-indigo-900 rounded-xl hover:bg-indigo-800 transition-colors">
                            <h3 className="text-xl font-medium mb-2 text-indigo-200">3. Gas Abstraction</h3>
                            <p className="text-indigo-300">Paymaster covers gas fees. Agents only think in USDC transaction values.</p>
                        </div>
                        <div className="p-6 bg-emerald-900 rounded-xl hover:bg-emerald-800 transition-colors">
                            <h3 className="text-xl font-medium mb-2 text-emerald-200">4. x402 Standard</h3>
                            <p className="text-emerald-300">Native integration with x402 payment intents for standardized agent negotiation.</p>
                        </div>
                    </div>
                </section>

                {/* Architecture Section */}
                <section className="bg-neutral-900/50 p-10 rounded-3xl border border-neutral-800 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                    <h2 className="text-2xl font-light mb-12 relative z-10">Architecture Flow</h2>

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8 md:gap-4">
                        {/* Agent A */}
                        <div className="flex flex-col items-center gap-4 text-center z-10 group">
                            <div className="w-16 h-16 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                                🤖
                            </div>
                            <div className="text-sm font-medium text-neutral-300">Agent A</div>
                        </div>

                        {/* Connector 1 */}
                        <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-2 min-w-[80px]">
                            <div className="text-[10px] bg-neutral-800/80 backdrop-blur-sm px-2 py-1 rounded text-neutral-500 uppercase tracking-wider border border-neutral-700/50">Request</div>
                            <div className="w-0.5 h-8 md:w-full md:h-0.5 bg-neutral-700/50 relative">
                                <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-neutral-600 rounded-full"></div>
                                <div className="block md:hidden absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-neutral-600 rounded-full"></div>
                            </div>
                        </div>

                        {/* Agent B */}
                        <div className="flex flex-col items-center gap-4 text-center z-10 group">
                            <div className="w-16 h-16 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                                🤖
                            </div>
                            <div className="text-sm font-medium text-neutral-300">Agent B</div>
                        </div>

                        {/* Connector 2 */}
                        <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-2 min-w-[80px]">
                            <div className="text-[10px] bg-blue-900/20 backdrop-blur-sm text-blue-400 px-2 py-1 rounded uppercase tracking-wider border border-blue-900/30">x402 Intent</div>
                            <div className="w-0.5 h-8 md:w-full md:h-0.5 bg-blue-900/30 relative">
                                <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                <div className="block md:hidden absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                            </div>
                        </div>

                        {/* Weppo */}
                        <div className="flex flex-col items-center gap-4 text-center z-10 group">
                            <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-2xl shadow-[0_0_30px_-10px_rgba(59,130,246,0.5)] group-hover:scale-110 transition-transform duration-300">
                                🧠
                            </div>
                            <div className="text-sm font-medium text-blue-200">Weppo</div>
                        </div>

                        {/* Connector 3 */}
                        <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-2 min-w-[80px]">
                            <div className="text-[10px] bg-emerald-900/20 backdrop-blur-sm text-emerald-400 px-2 py-1 rounded uppercase tracking-wider border border-emerald-900/30">USDC Settle</div>
                            <div className="w-0.5 h-8 md:w-full md:h-0.5 bg-emerald-900/30 relative">
                                <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                <div className="block md:hidden absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                            </div>
                        </div>

                        {/* Base */}
                        <div className="flex flex-col items-center gap-4 text-center z-10 group">
                            <div className="w-16 h-16 rounded-2xl bg-[#0052FF] text-white flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                                ⛓️
                            </div>
                            <div className="text-sm font-medium text-white">Base</div>
                        </div>
                    </div>
                </section>
                <p className="text-center font-light text-neutral-400 max-w-2xl mx-auto leading-relaxed relative z-10">
                    Weppo turns agent requests into paid, deterministic USDC settlement—so agents can monetize every interaction
                </p>
                {/* Roadmap Section */}
                <section>
                    <h2 className="text-3xl font-light mb-8">Roadmap</h2>
                    <div className="space-y-3">
                        {[
                            "Smart contract: escrow + programmable authorization",
                            "x402 adapter / integration",
                            "Paymaster integration",
                            "SDK for agents",
                            "Event-based transaction indexing",
                            "Agent identity layer (optional v2)"
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 border border-neutral-800 rounded-lg">
                                <div className="w-5 h-5 rounded-full border-2 border-neutral-700"></div>
                                <span className="text-neutral-300">{item}</span>
                            </div>
                        ))}
                    </div>
                </section>

            </main>
        </div>
    );
}
