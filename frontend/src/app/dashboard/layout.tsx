"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  LogOut,
} from "lucide-react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { getUser, signOut } from "@/lib/auth";
import { createClient } from "@/lib/supabase";
import type { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function AvatarFallback({ name }: { name: string }) {
  return (
    <div className="h-7 w-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
      {getInitials(name)}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    getUser().then(setUser);

    // Listen for auth state changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
      if (!session) router.push("/login");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Account";

  const avatarUrl = user?.user_metadata?.avatar_url;

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

          <div className="flex flex-col gap-1">
            {/* User profile */}
            <SidebarLink
              link={{
                label: displayName,
                href: "/dashboard/settings",
                icon: avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    className="h-7 w-7 rounded-full flex-shrink-0 object-cover"
                    width={28}
                    height={28}
                    alt="User avatar"
                  />
                ) : (
                  <AvatarFallback name={displayName} />
                ),
              }}
            />

            {/* Sign out */}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-2 py-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors text-sm w-full"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {open && <span>Sign Out</span>}
            </button>
          </div>
        </SidebarBody>
      </Sidebar>

      <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
        {children}
      </div>
    </div>
  );
}
