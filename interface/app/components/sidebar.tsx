"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import logo from "@/public/logo-white.png"
import Image from "next/image"
import {
  RiDashboard3Line,
  RiRobot2Line,
  RiWallet3Line,
  RiBillLine,
  RiShieldKeyholeLine,
  RiSettings4Line,
  RiLogoutBoxLine,
} from "@remixicon/react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

const navItems = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: RiDashboard3Line,
  },
  {
    title: "Agents",
    url: "/dashboard/agents",
    icon: RiRobot2Line,
  },
  {
    title: "Treasury",
    url: "/dashboard/treasury",
    icon: RiWallet3Line,
  },
  {
    title: "Tracking",
    url: "/dashboard/tracking",
    icon: RiBillLine,
  },
  {
    title: "Pre-authorizations",
    url: "/dashboard/permissions",
    icon: RiShieldKeyholeLine,
  },
]

export function AppSidebar() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <Sidebar className="w-64 border-r-1 border-neutral-900">
      <SidebarHeader className="flex flex-row items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Image src={logo} alt="Logo" width={100} height={100} />
        </div>
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title} className="w-full flex justify-center mb-2">
                  <SidebarMenuButton
                    render={<Link href={item.url} className="flex flex-row items-center gap-2" />}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/dashboard/settings" className="flex flex-row items-center gap-2" />}
                  tooltip="Settings"
                >
                  <RiSettings4Line />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-neutral-900/50 space-y-2">
        <div className="flex items-center gap-2 px-2 py-1 text-xs text-neutral-500">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Base Sepolia</span>
        </div>
        {email && (
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs text-neutral-400 truncate max-w-[130px]">{email}</span>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="text-neutral-600 hover:text-red-400 transition-colors p-1 rounded"
            >
              <RiLogoutBoxLine className="w-4 h-4" />
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}