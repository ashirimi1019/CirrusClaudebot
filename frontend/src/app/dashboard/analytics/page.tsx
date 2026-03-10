"use client";
import React, { useEffect, useState } from "react";
import {
  BarChart3, TrendingUp, Mail, Users, Building2,
  MessageSquare, Target, Loader2, ArrowUpRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type CampaignWithMetrics = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  campaign_metrics: {
    emails_sent: number;
    emails_opened: number;
    replies_total: number;
    replies_positive: number;
    bounces: number;
    meetings_booked: number;
    open_rate: number;
    reply_rate: number;
    bounce_rate: number;
    measured_at: string;
  }[];
};

type ApiLog = {
  tool: string;
  status_code: number;
  created_at: string;
};

type FunnelStep = { label: string; value: number; pct: number; color: string };

function pct(n: number | null | undefined, total: number) {
  if (!n || !total) return "0%";
  return ((n / total) * 100).toFixed(1) + "%";
}

function MetricCard({ label, value, trend, icon: Icon, color, sub }: {
  label: string; value: string; trend?: string; positive?: boolean; icon: React.ElementType; color: string; sub?: string;
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
      {(trend || sub) && (
        <div className="text-xs text-neutral-500">{trend || sub}</div>
      )}
    </div>
  );
}

function FunnelBar({ steps }: { steps: FunnelStep[] }) {
  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
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
    ]).then(([c, logs, comp, buyers]) => {
      if (c.data) setCampaigns(c.data as CampaignWithMetrics[]);
      if (logs.data) setApiLogs(logs.data as ApiLog[]);
      setCompaniesCount(comp.count ?? 0);
      setContactsCount(buyers.count ?? 0);
      setLoading(false);
    });
  }, []);

  // Aggregate metrics across all campaigns
  const totalSent = campaigns.reduce((s, c) => s + (c.campaign_metrics?.[0]?.emails_sent ?? 0), 0);
  const totalOpened = campaigns.reduce((s, c) => s + (c.campaign_metrics?.[0]?.emails_opened ?? 0), 0);
  const totalReplies = campaigns.reduce((s, c) => s + (c.campaign_metrics?.[0]?.replies_total ?? 0), 0);
  const totalPositive = campaigns.reduce((s, c) => s + (c.campaign_metrics?.[0]?.replies_positive ?? 0), 0);
  const totalBounces = campaigns.reduce((s, c) => s + (c.campaign_metrics?.[0]?.bounces ?? 0), 0);
  const totalMeetings = campaigns.reduce((s, c) => s + (c.campaign_metrics?.[0]?.meetings_booked ?? 0), 0);

  const overallOpenRate = totalSent ? totalOpened / totalSent : 0;
  const overallReplyRate = totalSent ? totalReplies / totalSent : 0;
  const overallBounceRate = totalSent ? totalBounces / totalSent : 0;

  // API cost estimate
  const apiCallsByTool: Record<string, number> = {};
  apiLogs.forEach((l) => { apiCallsByTool[l.tool] = (apiCallsByTool[l.tool] ?? 0) + 1; });

  // Funnel
  const funnelSteps: FunnelStep[] = [
    { label: "Companies discovered", value: companiesCount, pct: 100, color: "bg-indigo-500" },
    { label: "Decision-makers found", value: contactsCount, pct: companiesCount ? (contactsCount / companiesCount) * 100 : 0, color: "bg-violet-500" },
    { label: "Emails sent", value: totalSent, pct: contactsCount ? (totalSent / contactsCount) * 100 : 0, color: "bg-blue-500" },
    { label: "Emails opened", value: totalOpened, pct: totalSent ? (totalOpened / totalSent) * 100 : 0, color: "bg-cyan-500" },
    { label: "Replies received", value: totalReplies, pct: totalSent ? (totalReplies / totalSent) * 100 : 0, color: "bg-emerald-500" },
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
        <MetricCard label="Emails Sent" value={totalSent.toLocaleString() || "0"} icon={Mail} color="bg-indigo-500/20" />
        <MetricCard label="Open Rate" value={totalSent ? (overallOpenRate * 100).toFixed(1) + "%" : "—"} icon={BarChart3} color="bg-violet-500/20" />
        <MetricCard label="Reply Rate" value={totalSent ? (overallReplyRate * 100).toFixed(1) + "%" : "—"} icon={MessageSquare} color="bg-emerald-500/20" />
        <MetricCard label="Meetings Booked" value={totalMeetings.toString()} icon={Users} color="bg-rose-500/20" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Funnel */}
        <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-6">
          <h2 className="text-sm font-semibold text-white mb-6">Pipeline Funnel</h2>
          {companiesCount === 0 && contactsCount === 0 && totalSent === 0 ? (
            <div className="py-8 text-center">
              <Target className="h-8 w-8 text-neutral-700 mx-auto mb-3" />
              <p className="text-neutral-500 text-sm">No pipeline data yet.</p>
              <p className="text-neutral-600 text-xs mt-1">Run Skills 4 & 5 to generate funnel data.</p>
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
                  {["Campaign", "Sent", "Open %", "Reply %", "Meetings"].map((h) => (
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
                      <td className="px-4 py-3 text-neutral-400 text-xs">{m?.emails_sent?.toLocaleString() ?? "—"}</td>
                      <td className="px-4 py-3 text-xs">
                        {m?.open_rate ? (
                          <span className="text-indigo-400">{(m.open_rate * 100).toFixed(1)}%</span>
                        ) : <span className="text-neutral-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {m?.reply_rate ? (
                          <span className={m.reply_rate >= 0.05 ? "text-emerald-400" : "text-amber-400"}>
                            {(m.reply_rate * 100).toFixed(1)}%
                          </span>
                        ) : <span className="text-neutral-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {m?.meetings_booked ? (
                          <span className="text-emerald-400 flex items-center gap-0.5">
                            {m.meetings_booked} <ArrowUpRight className="h-3 w-3" />
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
