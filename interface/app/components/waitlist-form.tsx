"use client";

import { useActionState } from "react";
import { addToWaitlist } from "../actions";

const initialState = {
    success: false,
    message: "",
};

export function WaitlistForm({ children }: { children?: React.ReactNode }) {
    const [state, formAction, isPending] = useActionState(addToWaitlist, initialState);

    return (
        <div className="flex flex-col items-center">
            <form action={formAction} className="flex items-center justify-center gap-4">
                <input
                    type="email"
                    name="email"
                    placeholder="enter your email..."
                    required
                    className="text-white px-5 py-2.5 rounded-full border border-neutral-800 bg-neutral-900/50 focus:border-neutral-600 outline-none transition-all w-64 placeholder:text-neutral-600"
                />
                <button
                    type="submit"
                    disabled={isPending}
                    className="text-black bg-white px-6 py-2.5 rounded-full font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isPending ? "joining..." : "join waitlist"}
                </button>
                {children}
            </form>
            {state?.message && (
                <p className={`mt-4 text-sm font-medium ${state.success ? "text-emerald-400" : "text-red-400"}`}>
                    {state.message}
                </p>
            )}
        </div>
    );
}
