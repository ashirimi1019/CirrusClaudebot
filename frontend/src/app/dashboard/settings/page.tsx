"use client";
import React, { useState, useEffect } from "react";
import {
  Settings, Database, Globe, Check, X,
  Zap, BarChart3, FileSpreadsheet, Shield, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar, deriveDisplayName } from "@/components/ui/user-avatar";
import { getUser } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

type Integration = {
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  docs: string;
  status: "connected" | "missing";
};

const integrations: Integration[] = [
  {
    name: "Supabase",
    description: "Database for companies, contacts, campaigns and metrics",
    icon: Database,
    color: "bg-emerald-500/20 text-emerald-400",
    docs: "https://supabase.com/docs",
    status: process.env.NEXT_PUBLIC_SUPABASE_URL ? "connected" : "missing",
  },
  {
    name: "Apollo.io",
    description: "Signal detection, contact enrichment, email sequences",
    icon: Zap,
    color: "bg-indigo-500/20 text-indigo-400",
    docs: "https://apolloio.github.io/apollo-api-docs/",
    status: "connected",
  },
  {
    name: "OpenAI",
    description: "AI copy generation and reply classification",
    icon: BarChart3,
    color: "bg-violet-500/20 text-violet-400",
    docs: "https://platform.openai.com/docs",
    status: "connected",
  },
  {
    name: "Google Sheets",
    description: "Stakeholder visibility and campaign export",
    icon: FileSpreadsheet,
    color: "bg-amber-500/20 text-amber-400",
    docs: "https://developers.google.com/sheets/api",
    status: "connected",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUser()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  const displayName = deriveDisplayName(user);
  const avatarUrl = user?.user_metadata?.avatar_url;
  const email = user?.email ?? "";

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-neutral-500 mt-0.5">Account, integrations, and system info</p>
      </div>

      {/* Account */}
      <div className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center gap-2">
          <Shield className="h-4 w-4 text-neutral-400" />
          <h2 className="text-sm font-semibold text-white">Account</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-neutral-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-xs">Loading account…</span>
          </div>
        ) : (
          <div className="p-5 flex items-center gap-4">
            <UserAvatar avatarUrl={avatarUrl} displayName={displayName} size="md" />
            <div className="min-w-0">
              <div className="text-white font-medium truncate">{displayName}</div>
              {email && (
                <div className="text-neutral-500 text-sm truncate">{email}</div>
              )}
            </div>
            <div className="ml-auto flex-shrink-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Active
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Integrations */}
      <div className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center gap-2">
          <Globe className="h-4 w-4 text-neutral-400" />
          <h2 className="text-sm font-semibold text-white">Integrations</h2>
        </div>
        <div className="divide-y divide-neutral-800/60">
          {integrations.map((integration) => (
            <div key={integration.name} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", integration.color)}>
                  <integration.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{integration.name}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">{integration.description}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border",
                  integration.status === "connected"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                )}>
                  {integration.status === "connected"
                    ? <><Check className="h-3 w-3" /> Connected</>
                    : <><X className="h-3 w-3" /> Not configured</>
                  }
                </span>
                <a href={integration.docs} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors">
                  Docs →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Info */}
      <div className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center gap-2">
          <Settings className="h-4 w-4 text-neutral-400" />
          <h2 className="text-sm font-semibold text-white">System</h2>
        </div>
        <div className="divide-y divide-neutral-800/60">
          {[
            { label: "Skills", value: "6 skills operational" },
            { label: "Pipeline", value: "Signal-driven outbound" },
            { label: "Database", value: "Supabase (PostgreSQL)" },
            { label: "Framework", value: "Next.js 15 + TypeScript" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-5 py-3">
              <span className="text-xs text-neutral-500">{label}</span>
              <span className="text-xs font-mono text-neutral-300">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
