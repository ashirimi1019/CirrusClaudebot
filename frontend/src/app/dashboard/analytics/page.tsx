"use client";
import React, { useEffect, useState } from "react";
import {
  BarChart3, TrendingUp, Mail, Users, Building2,
  MessageSquare, Target, Loader2, ArrowUpRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type CampaignMetric = {
  total_companies: number;
  total_contacts: number;
  total_messages: number;
  total_replies: number;
  total_meetings: number;
  reply_rate: number | null;
  meeting_rate: number | null;
  created_at: string;
};

type CampaignWithMetrics = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  campaign_metrics: CampaignMetric[];
};

type ApiLog = {
  tool: string;
  status_code: number;
  created_at: string;
};

type FunnelStep = { label: string; value: number; pct: number; color: string };

function MetricCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500 uppercase tracking-wider">{label}</span>
        <div className={cn("p-1.5 rounded-lg", color)}>
          <Icon className="h-3.5 w-3.5 text-white/80" />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-neutral-500">{sub}</div>}
    </div>
  );
}

function FunnelBar({ steps }: { steps: FunnelStep[] }) {
  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <div key={step.label}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-neutral-300">{step.label}</span>
            <span className="text-sm font-medium text-white">{step.value.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700", step.color)}
              style={{ width: `${Math.max(step.pct, 2)}%` }}
            />
          </div>
          <div className="text-xs text-neutral-600 mt-1">{step.pct.toFixed(1)}% of pipeline</div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [campaigns, setCampaigns] = useState<CampaignWithMetrics[]>([]);
  const [apiLogs, setApiLogs] = useState<ApiLog[]>([]);
  const [companiesCount, setCompaniesCount] = useState(0);
  const [contactsCount, setContactsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("campaigns").select("id, name, slug, created_at, campaign_metrics(*)").order("created_at", { ascending: false }),
      supabase.from("tool_usage").select("tool, status_code, created_at").order("created_at", { ascending: false }).limit(500),
      supabase.from("companies").select("id", { count: "exact", head: true }),
      supabase.from("contacts").select("id", { count: "exact", head: true }),
    ]).then(([c, logs, comp, contacts]) => {
      if (c.data) setCampaigns(c.data as CampaignWithMetrics[]);
      if (logs.data) setApiLogs(logs.data as ApiLog[]);
      setCompaniesCount(comp.count ?? 0);
      setContactsCount(contacts.count ?? 0);
      setLoading(false);
    });
  }, []);

  // Aggregate metrics across all campaigns using correct DB field names
  const totalMessages = campaigns.reduce((s, c) => s + (c.campaign_metrics?.[0]?.total_messages ?? 0), 0);
  const totalReplies = campaigns.reduce((s, c) => s + (c.campaign_metrics?.[0]?.total_replies ?? 0), 0);
  const totalMeetings = campaigns.reduce((s, c) => s + (c.campaign_metrics?.[0]?.total_meetings ?? 0), 0);

  const overallReplyRate = totalMessages ? totalReplies / totalMessages : 0;
  const overallMeetingRate = totalReplies ? totalMeetings / totalReplies : 0;

  // API cost estimate
  const apiCallsByTool: Record<string, number> = {};
  apiLogs.forEach((l) => { apiCallsByTool[l.tool] = (apiCallsByTool[l.tool] ?? 0) + 1; });

  // Funnel (using fields that exist in DB)
  const funnelSteps: FunnelStep[] = [
    { label: "Companies discovered", value: companiesCount, pct: 100, color: "bg-indigo-500" },
    { label: "Decision-makers found", value: contactsCount, pct: companiesCount ? (contactsCount / companiesCount) * 100 : 0, color: "bg-violet-500" },
    { label: "Messages sent", value: totalMessages, pct: contactsCount ? (totalMessages / contactsCount) * 100 : 0, color: "bg-blue-500" },
    { label: "Replies received", value: totalReplies, pct: totalMessages ? (totalReplies / totalMessages) * 100 : 0, color: "bg-emerald-500" },
    { label: "Meetings booked", value: totalMeetings, pct: totalReplies ? (totalMeetings / totalReplies) * 100 : 0, color: "bg-amber-500" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-40 text-neutral-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-neutral-500 mt-0.5">Across {campaigns.length} campaigns</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Messages Sent" value={totalMessages.toLocaleString() || "0"} icon={Mail} color="bg-indigo-500/20" />
        <MetricCard label="Reply Rate" value={totalMessages ? (overallReplyRate * 100).toFixed(1) + "%" : "—"} icon={MessageSquare} color="bg-emerald-500/20" />
        <MetricCard label="Meetings Booked" value={totalMeetings.toString()} icon={Users} color="bg-rose-500/20" />
        <MetricCard label="Companies Found" value={companiesCount.toLocaleString()} icon={Building2} color="bg-violet-500/20" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Funnel */}
        <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-6">
          <h2 className="text-sm font-semibold text-white mb-6">Pipeline Funnel</h2>
          {companiesCount === 0 && contactsCount === 0 && totalMessages === 0 ? (
            <div className="py-8 text-center">
              <Target className="h-8 w-8 text-neutral-700 mx-auto mb-3" />
              <p className="text-neutral-500 text-sm">No pipeline data yet.</p>
              <p className="text-neutral-600 text-xs mt-1">Run Skills 4 &amp; 5 to generate funnel data.</p>
            </div>
          ) : (
            <FunnelBar steps={funnelSteps} />
          )}
        </div>

        {/* Campaign performance table */}
        <div className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-800">
            <h2 className="text-sm font-semibold text-white">Campaign Performance</h2>
          </div>
          {campaigns.length === 0 ? (
            <div className="py-12 text-center">
              <BarChart3 className="h-8 w-8 text-neutral-700 mx-auto mb-3" />
              <p className="text-neutral-500 text-sm">No campaigns yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800">
                  {["Campaign", "Sent", "Replies", "Reply %", "Meetings"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-neutral-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const m = c.campaign_metrics?.[0];
                  return (
                    <tr key={c.id} className="border-b border-neutral-800/60 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-neutral-300 text-xs max-w-[160px] truncate">{c.name}</td>
                      <td className="px-4 py-3 text-neutral-400 text-xs">{m?.total_messages?.toLocaleString() ?? "—"}</td>
                      <td className="px-4 py-3 text-neutral-400 text-xs">{m?.total_replies?.toLocaleString() ?? "—"}</td>
                      <td className="px-4 py-3 text-xs">
                        {m?.reply_rate ? (
                          <span className={m.reply_rate >= 0.05 ? "text-emerald-400" : "text-amber-400"}>
                            {(m.reply_rate * 100).toFixed(1)}%
                          </span>
                        ) : <span className="text-neutral-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {m?.total_meetings ? (
                          <span className="text-emerald-400 flex items-center gap-0.5">
                            {m.total_meetings} <ArrowUpRight className="h-3 w-3" />
                          </span>
                        ) : <span className="text-neutral-600">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* API Usage */}
      <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-6">
        <h2 className="text-sm font-semibold text-white mb-4">API Usage</h2>
        {Object.keys(apiCallsByTool).length === 0 ? (
          <p className="text-neutral-600 text-sm">No API calls logged yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(apiCallsByTool).map(([tool, count]) => (
              <div key={tool} className="bg-neutral-800/60 rounded-lg p-4">
                <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">{tool}</div>
                <div className="text-xl font-bold text-white">{count.toLocaleString()}</div>
                <div className="text-xs text-neutral-600 mt-1">calls logged</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
