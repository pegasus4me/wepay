"use client";

import { useState } from "react";
import { RiCheckLine, RiFileCopyLine } from "@remixicon/react";

export function CopyButton({ value }: { value: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button onClick={copy} className="text-neutral-500 hover:text-white transition-colors">
            {copied ? <RiCheckLine className="w-3.5 h-3.5 text-green-500" /> : <RiFileCopyLine className="w-3.5 h-3.5" />}
        </button>
    );
}
