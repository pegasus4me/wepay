"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { RiMailLine, RiCheckLine, RiArrowRightLine, RiLoader4Line } from "@remixicon/react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            setError(error.message);
        } else {
            setSent(true);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
            <div className="w-full max-w-sm space-y-8">
                {/* Logo */}
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                        <span className="text-white font-bold text-xl">W</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Weppo</h1>
                    <p className="text-neutral-400 text-sm">The Consumer Abstraction Layer for AI Agents</p>
                </div>

                {!sent ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm text-neutral-300 font-medium">Email address</label>
                            <div className="relative">
                                <RiMailLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="agent@example.com"
                                    required
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !email}
                            className="w-full flex items-center justify-center gap-2 bg-white text-black font-semibold py-3 px-4 rounded-xl hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? (
                                <RiLoader4Line className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    Send Magic Link <RiArrowRightLine className="w-4 h-4" />
                                </>
                            )}
                        </button>

                        <p className="text-xs text-center text-neutral-500">
                            We'll send a login link to your email. No password needed.
                        </p>
                    </form>
                ) : (
                    <div className="text-center space-y-4 bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8">
                        <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
                            <RiCheckLine className="w-6 h-6 text-green-500" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-white font-semibold">Check your inbox</h2>
                            <p className="text-sm text-neutral-400">
                                We sent a magic link to <span className="text-white">{email}</span>
                            </p>
                        </div>
                        <button
                            onClick={() => { setSent(false); setEmail(""); }}
                            className="text-xs text-neutral-500 hover:text-white transition-colors"
                        >
                            Use a different email
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
