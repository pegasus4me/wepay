import { AppSidebar } from "../components/sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div>
            <SidebarProvider>
                <AppSidebar />
                <main className="flex-1 overflow-auto p-6">
                    {children}
                </main>
            </SidebarProvider>
        </div>
    );
}