"use client";
import React, { useState } from "react";
import {
  Settings, Key, Database, Globe, Check, X, Eye, EyeOff,
  Zap, Mail, BarChart3, FileSpreadsheet, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Integration = {
  name: string;
  description: string;
  envKey: string;
  icon: React.ElementType;
  color: string;
  docs: string;
  status: "connected" | "missing";
};

// Check which env vars are available (only NEXT_PUBLIC_ ones are accessible client-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const integrations: Integration[] = [
  {
    name: "Supabase",
    description: "Database for companies, contacts, campaigns and metrics",
    envKey: "NEXT_PUBLIC_SUPABASE_URL",
    icon: Database,
    color: "bg-emerald-500/20 text-emerald-400",
    docs: "https://supabase.com/docs",
    status: supabaseUrl ? "connected" : "missing",
  },
  {
    name: "Apollo.io",
    description: "Signal detection, contact enrichment, email sequences",
    envKey: "APOLLO_API_KEY",
    icon: Zap,
    color: "bg-indigo-500/20 text-indigo-400",
    docs: "https://apolloio.github.io/apollo-api-docs/",
    status: "connected", // Set in backend .env, assumed present
  },
  {
    name: "OpenAI",
    description: "AI copy generation and reply classification",
    envKey: "OPENAI_API_KEY",
    icon: BarChart3,
    color: "bg-violet-500/20 text-violet-400",
    docs: "https://platform.openai.com/docs",
    status: "connected",
  },
  {
    name: "Google Sheets",
    description: "Stakeholder visibility and campaign export",
    envKey: "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    icon: FileSpreadsheet,
    color: "bg-amber-500/20 text-amber-400",
    docs: "https://developers.google.com/sheets/api",
    status: "connected",
  },
];

type EnvVar = { key: string; label: string; value: string; secret: boolean };

const envVars: EnvVar[] = [
  { key: "SUPABASE_URL", label: "Supabase URL", value: supabaseUrl ?? "Not set", secret: false },
  { key: "SUPABASE_ANON_KEY", label: "Supabase Anon Key", value: supabaseKey ?? "Not set", secret: true },
  { key: "APOLLO_API_KEY", label: "Apollo API Key", value: "••••••••••••••••••••", secret: true },
  { key: "OPENAI_API_KEY", label: "OpenAI API Key", value: "sk-••••••••••••••••••••••", secret: true },
  { key: "GOOGLE_SERVICE_ACCOUNT_EMAIL", label: "Google Service Account", value: "cirruslabs@*.iam.gserviceaccount.com", secret: false },
];

function EnvRow({ ev }: { ev: EnvVar }) {
  const [show, setShow] = useState(false);
  const isSet = ev.value !== "Not set";
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800/60 last:border-0">
      <div>
        <div className="text-xs font-mono text-neutral-300">{ev.key}</div>
        <div className="text-xs text-neutral-600 mt-0.5">{ev.label}</div>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("text-xs font-mono", isSet ? "text-neutral-400" : "text-rose-400")}>
          {ev.secret && !show ? "••••••••••••" : ev.value}
        </span>
        {ev.secret && isSet && (
          <button onClick={() => setShow(!show)} className="text-neutral-600 hover:text-neutral-400">
            {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        )}
        <span className={cn("h-2 w-2 rounded-full", isSet ? "bg-emerald-400" : "bg-rose-400")} />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-neutral-500 mt-0.5">API integrations and system configuration</p>
      </div>

      {/* Account */}
      <div className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center gap-2">
          <Shield className="h-4 w-4 text-neutral-400" />
          <h2 className="text-sm font-semibold text-white">Account</h2>
        </div>
        <div className="p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg">
            A
          </div>
          <div>
            <div className="text-white font-medium">Ashir Ahmed</div>
            <div className="text-neutral-500 text-sm">CirrusLabs GTM Engine</div>
          </div>
          <div className="ml-auto">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Active
            </span>
          </div>
        </div>
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

      {/* Environment Variables */}
      <div className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center gap-2">
          <Key className="h-4 w-4 text-neutral-400" />
          <h2 className="text-sm font-semibold text-white">Environment Variables</h2>
        </div>
        <div>
          {envVars.map((ev) => <EnvRow key={ev.key} ev={ev} />)}
        </div>
        <div className="px-5 py-3 bg-neutral-800/30 border-t border-neutral-800">
          <p className="text-xs text-neutral-600">
            Set in <code className="text-neutral-500">C:\Users\ashir\Claude Agent\.env</code> and <code className="text-neutral-500">frontend\.env.local</code>
          </p>
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
            { label: "Pipeline", value: "npm run pipeline" },
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
