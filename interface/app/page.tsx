import { HeaderPage } from './components/header';
import { FooterPage } from './components/footer';

export default function Page() {
    return (
        <div className="max-w-7xl mx-auto px-4 pb-20">
            <HeaderPage />
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-bold">Weppo</h1>
                    <p className="text-gray-500">Programmable Monetization layer for autonomous agents.</p>
                </div>
            </div>
            <FooterPage />
        </div>
    );
}