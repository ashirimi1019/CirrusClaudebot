"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Target, Plus, Circle, CheckCircle2, AlertCircle,
  ArrowUpRight, Mail, Users, TrendingUp, Calendar, Loader2, ChevronRight,
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

type Campaign = {
  id: string;
  slug: string;
  name: string;
  offer_id: string;
  strategy: Record<string, string> | null;
  created_at: string;
  campaign_metrics: CampaignMetric[];
  offers: { slug: string } | null;
};

function deriveStatus(c: Campaign): "active" | "complete" | "draft" {
  if (!c.campaign_metrics?.length) return "draft";
  const m = c.campaign_metrics[0];
  if (!m.total_messages) return "draft";
  const daysSince = (Date.now() - new Date(m.created_at).getTime()) / 86400000;
  return daysSince > 21 ? "complete" : "active";
}

const statusConfig = {
  active: { label: "Active", icon: Circle, className: "text-emerald-400" },
  complete: { label: "Complete", icon: CheckCircle2, className: "text-indigo-400" },
  draft: { label: "Draft", icon: AlertCircle, className: "text-neutral-500" },
};

function pct(n: number | null | undefined) {
  if (!n) return "—";
  return (n * 100).toFixed(1) + "%";
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "complete" | "draft">("all");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("campaigns")
      .select("*, campaign_metrics(*), offers(slug)")
      .order("created_at", { ascending: false })
      .then(({ data }: { data: Campaign[] | null }) => {
        if (data) setCampaigns(data as Campaign[]);
        setLoading(false);
      });
  }, []);

  const filtered = campaigns.filter((c) =>
    filter === "all" ? true : deriveStatus(c) === filter
  );

  const totalSent = campaigns.reduce((sum, c) => sum + (c.campaign_metrics?.[0]?.total_messages ?? 0), 0);
  const totalMeetings = campaigns.reduce((sum, c) => sum + (c.campaign_metrics?.[0]?.total_meetings ?? 0), 0);
  const avgReply = campaigns.length
    ? campaigns.reduce((sum, c) => sum + (c.campaign_metrics?.[0]?.reply_rate ?? 0), 0) / campaigns.length
    : 0;

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white">Campaigns</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{campaigns.length} total campaigns</p>
        </div>
        <Link href="/dashboard/offers" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
          <Plus className="h-4 w-4" />
          New Campaign
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Campaigns", value: campaigns.length.toString(), icon: Target, color: "bg-indigo-500/20" },
          { label: "Messages Sent", value: totalSent.toLocaleString() || "—", icon: Mail, color: "bg-violet-500/20" },
          { label: "Avg Reply Rate", value: avgReply ? pct(avgReply) : "—", icon: TrendingUp, color: "bg-emerald-500/20" },
          { label: "Meetings Booked", value: totalMeetings.toString() || "—", icon: Users, color: "bg-rose-500/20" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl bg-neutral-900 border border-neutral-800 p-5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500 uppercase tracking-wider">{label}</span>
              <div className={cn("p-1.5 rounded-lg", color)}>
                <Icon className="h-3.5 w-3.5 text-white/80" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-neutral-900 border border-neutral-800 rounded-lg p-1 w-fit">
        {(["all", "active", "complete", "draft"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors",
              filter === f ? "bg-white/[0.08] text-white" : "text-neutral-500 hover:text-neutral-300"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-neutral-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading campaigns...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Target className="h-8 w-8 text-neutral-700 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm">No campaigns yet.</p>
            <p className="text-neutral-600 text-xs mt-1">Create one via <Link href="/dashboard/offers" className="text-indigo-400 hover:underline">Offers</Link>.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800">
                {["Campaign", "Status", "Sent", "Contacts", "Reply Rate", "Meetings", "Created", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs text-neutral-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const status = deriveStatus(c);
                const s = statusConfig[status];
                const m = c.campaign_metrics?.[0];
                const href = c.offers?.slug
                  ? `/dashboard/offers/${c.offers.slug}/campaigns/${c.slug}`
                  : null;
                return (
                  <tr key={c.id} className="border-b border-neutral-800/60 last:border-0 hover:bg-white/[0.02] transition-colors group">
                    <td className="px-5 py-4">
                      <div className="font-medium text-white text-sm group-hover:text-indigo-300 transition-colors">{c.name}</div>
                      <div className="text-xs text-neutral-500 mt-0.5 font-mono">{c.slug}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn("inline-flex items-center gap-1.5 text-xs", s.className)}>
                        <s.icon className="h-3 w-3" />
                        {s.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-neutral-300">{m?.total_messages?.toLocaleString() ?? "—"}</td>
                    <td className="px-5 py-4 text-neutral-300">{m?.total_contacts?.toLocaleString() ?? "—"}</td>
                    <td className="px-5 py-4 text-neutral-300">{pct(m?.reply_rate)}</td>
                    <td className="px-5 py-4">
                      {m?.total_meetings ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          {m.total_meetings} <ArrowUpRight className="h-3 w-3" />
                        </span>
                      ) : <span className="text-neutral-600">—</span>}
                    </td>
                    <td className="px-5 py-4 text-neutral-500 text-xs">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {href && (
                        <Link
                          href={href}
                          className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          Open <ChevronRight className="h-3 w-3" />
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
