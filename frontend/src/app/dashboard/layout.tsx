"use client";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Target,
  Users,
  Building2,
  BarChart3,
  Settings,
  Zap,
  Briefcase,
} from "lucide-react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";

const navLinks = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="text-neutral-400 h-5 w-5 flex-shrink-0" />,
  },
  {
    label: "Offers",
    href: "/dashboard/offers",
    icon: <Briefcase className="text-neutral-400 h-5 w-5 flex-shrink-0" />,
  },
  {
    label: "Campaigns",
    href: "/dashboard/campaigns",
    icon: <Target className="text-neutral-400 h-5 w-5 flex-shrink-0" />,
  },
  {
    label: "Companies",
    href: "/dashboard/companies",
    icon: <Building2 className="text-neutral-400 h-5 w-5 flex-shrink-0" />,
  },
  {
    label: "Contacts",
    href: "/dashboard/contacts",
    icon: <Users className="text-neutral-400 h-5 w-5 flex-shrink-0" />,
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: <BarChart3 className="text-neutral-400 h-5 w-5 flex-shrink-0" />,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: <Settings className="text-neutral-400 h-5 w-5 flex-shrink-0" />,
  },
];

const Logo = () => (
  <Link href="/dashboard" className="flex items-center gap-2.5 py-1 group">
    <div className="h-6 w-6 bg-indigo-500 rounded-md flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-400 transition-colors">
      <Zap className="h-3.5 w-3.5 text-white" />
    </div>
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="font-semibold text-white text-sm whitespace-pre"
    >
      CirrusLabs
    </motion.span>
  </Link>
);

const LogoIcon = () => (
  <Link href="/dashboard" className="flex items-center py-1">
    <div className="h-6 w-6 bg-indigo-500 rounded-md flex items-center justify-center flex-shrink-0">
      <Zap className="h-3.5 w-3.5 text-white" />
    </div>
  </Link>
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-[#0a0a0a] overflow-hidden">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-6 bg-neutral-950 border-r border-neutral-800/60">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            <div className="mb-8">
              {open ? <Logo /> : <LogoIcon />}
            </div>
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <SidebarLink
                  key={link.label}
                  link={link}
                  className={
                    pathname === link.href
                      ? "bg-white/[0.05] rounded-lg px-2"
                      : "px-2"
                  }
                />
              ))}
            </nav>
          </div>
          <SidebarLink
            link={{
              label: "Ashir Ahmed",
              href: "/dashboard/settings",
              icon: (
                <Image
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop&crop=face"
                  className="h-7 w-7 rounded-full flex-shrink-0 object-cover"
                  width={28}
                  height={28}
                  alt="User avatar"
                />
              ),
            }}
          />
        </SidebarBody>
      </Sidebar>

      <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
        {children}
      </div>
    </div>
  );
}
