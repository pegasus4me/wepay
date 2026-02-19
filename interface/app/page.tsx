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
            <h3 className="text-xl font-medium mb-2">1. Fund Escrow</h3>
<p className="text-slate-300 leading-relaxed">
  Top up USDC so your agent can pay and get paid autonomously.
</p>

<h3 className="text-xl font-medium mb-2">2. Configure Pricing</h3>
<p className="text-stone-300 leading-relaxed">
  Set budgets, limits, and billing models from the dashboard or SKILL.md.
</p>

<h3 className="text-xl font-medium mb-2">3. Serve Requests</h3>
<p className="text-indigo-200 leading-relaxed">
  Your agent issues x402 intents and charges per request, per token, or per outcome.
</p>

<h3 className="text-xl font-medium mb-2">4. Settle & Track</h3>
<p className="text-neutral-300 leading-relaxed">
  Weppo settles on‑chain in USDC and updates balances and analytics deterministically.
</p>

          </div>
        </div>
      </section>
    </div>
  );
}

