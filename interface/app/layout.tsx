import "./globals.css";
import { Inter, Manrope } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });
const manrope = Manrope({ subsets: ["latin"] });

export const metadata = {
    title: "Weppo | The Consumer Abstraction Layer",
    description: "Seamless autonomous AI agent commerce.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={inter.className + " " + manrope.className}>
                {children}
            </body>
        </html>
    );
}
