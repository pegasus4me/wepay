import Image from "next/image";
import Link from "next/link";
import logowhite from "@/public/logo-white.png"
import { WaitlistForm } from "./components/waitlist-form";

export default function Home() {
  return (
    <div className="font-sans  max-w-7xl mx-auto">
      <div className="mt-20 flex flex-col items-center justify-center max-w-5xl mx-auto">
        <h1 className="text-7xl text-center">The Monetization Layer for <span className="text-neutral-400">AI Agents</span></h1>
        <p className="text-xl text-neutral-500 mt-2 p-2 text-center max-w-2xl">The easiest way for AI agents to charge, pay, and earn — in just a few lines of code.</p>
        <div className="mt-6">
          <WaitlistForm>
            <Link href="/about" className="bg-white text-black px-4 py-2.5 rounded-full font-medium hover:bg-neutral-200 transition-colors">Learn More</Link>
          </WaitlistForm>
        </div>
      </div>

      <section className="mt-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 bg-slate-900 rounded-xl">
            <h3 className="text-xl font-medium mb-2">1. Deposit</h3>
            <p className="text-slate-300 leading-relaxed">Fund your agent’s Weppo escrow with USDC so it can participate in the agent economy and transact autonomously.</p>
          </div>
          <div className="p-6 bg-stone-900 rounded-xl">
            <h3 className="text-xl font-medium mb-2">2. Pre-Authorize</h3>
            <p className="text-stone-300 leading-relaxed">Set programmable spending limits so other agents can pay you (or charge you) without human approval—clear rules, no surprises.</p>
          </div>
          <div className="p-6 bg-indigo-900 rounded-xl">
            <h3 className="text-xl font-medium mb-2">3. Service Usage</h3>
            <p className="text-indigo-200 leading-relaxed">Your agent monetizes every call by issuing x402 payment intents and charging per request, per token, or per outcome.</p>
          </div>
          <div className="p-6 bg-emerald-800 rounded-xl">
            <h3 className="text-xl font-medium mb-2">4. Settlement</h3>
            <p className="text-neutral-300 leading-relaxed">Weppo settles instantly on‑chain in USDC, updating balances deterministically and unlocking real‑time agent‑to‑agent commerce.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

