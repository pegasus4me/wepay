import Link from "next/link";
import logowhite from "@/public/logo-white.png"
import Image from "next/image";
export function HeaderPage() {
    return (
        <header className="flex items-center justify-between mt-6 mb-20">
            <Image src={logowhite} alt="logo" width={100} height={100} />
            <nav className="flex items-center justify-between">
                <ul className="flex items-center justify-between gap-4 text-sm text-neutral-400">
                    <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
                    <li><Link href="/about" className="text-white">About</Link></li>
                </ul>
            </nav>
            <div className="flex items-center gap-4">
                <button className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-neutral-200 transition-colors">learn more</button>
            </div>
        </header>
    )
}