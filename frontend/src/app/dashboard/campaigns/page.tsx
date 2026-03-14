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
  offers: { slug: string; verticals: { name: string; slug: string } | null } | null;
  verticals: { name: string; slug: string } | null;
};

function deriveStatus(c: Campaign): "active" | "complete" | "draft" {
  if (!c.campaign_metrics?.length) return "draft";
  const m = c.campaign_metrics.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  if (!m.total_messages) return "draft";
  const daysSince = (Date.now() - new Date(m.created_at).getTime()) / 86400000;
  return daysSince > 21 ? "complete" : "active";
}

const statusConfig = {
  active: {
    label: "Active",
    icon: Circle,
    pillClass: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    dotClass: "bg-emerald-400 animate-pulse",
  },
  complete: {
    label: "Complete",
    icon: CheckCircle2,
    pillClass: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
    dotClass: "bg-indigo-400",
  },
  draft: {
    label: "Draft",
    icon: AlertCircle,
    pillClass: "text-neutral-500 bg-neutral-800/40 border-neutral-700",
    dotClass: "bg-neutral-500",
  },
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
      .select("*, campaign_metrics(*), offers(slug, verticals(name, slug)), verticals(name, slug)")
      .order("created_at", { ascending: false })
      .then(({ data }: { data: Campaign[] | null }) => {
        if (data) setCampaigns(data as Campaign[]);
        setLoading(false);
      });
  }, []);

  const filtered = campaigns.filter((c) =>
    filter === "all" ? true : deriveStatus(c) === filter
  );

  const latestMetric = (c: Campaign) =>
    c.campaign_metrics?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  const totalSent = campaigns.reduce((sum, c) => sum + (latestMetric(c)?.total_messages ?? 0), 0);
  const totalMeetings = campaigns.reduce((sum, c) => sum + (latestMetric(c)?.total_meetings ?? 0), 0);
  const avgReply = campaigns.length
    ? campaigns.reduce((sum, c) => sum + (latestMetric(c)?.reply_rate ?? 0), 0) / campaigns.length
    : 0;

  const counts = {
    all: campaigns.length,
    active: campaigns.filter((c) => deriveStatus(c) === "active").length,
    complete: campaigns.filter((c) => deriveStatus(c) === "complete").length,
    draft: campaigns.filter((c) => deriveStatus(c) === "draft").length,
  };

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white">Campaigns</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {loading ? "Loading..." : `${campaigns.length} campaign${campaigns.length !== 1 ? "s" : ""} total`}
          </p>
        </div>
        <Link href="/dashboard/offers" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
          <Plus className="h-4 w-4" />
          New Campaign
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Campaigns", value: loading ? "—" : campaigns.length.toString(), icon: Target, color: "bg-indigo-500/20" },
          { label: "Messages Sent", value: loading ? "—" : (totalSent > 0 ? totalSent.toLocaleString() : "—"), icon: Mail, color: "bg-violet-500/20" },
          { label: "Avg Reply Rate", value: loading ? "—" : (avgReply ? pct(avgReply) : "—"), icon: TrendingUp, color: "bg-emerald-500/20" },
          { label: "Meetings Booked", value: loading ? "—" : (totalMeetings > 0 ? totalMeetings.toString() : "—"), icon: Users, color: "bg-rose-500/20" },
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
              "px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors flex items-center gap-1.5",
              filter === f ? "bg-white/[0.08] text-white" : "text-neutral-500 hover:text-neutral-300"
            )}
          >
            {f}
            {!loading && (
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-medium min-w-[18px] text-center",
                filter === f ? "bg-white/10 text-neutral-300" : "text-neutral-600"
              )}>
                {counts[f]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-neutral-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading campaigns...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Target className="h-8 w-8 text-neutral-700 mx-auto mb-3" />
            <p className="text-neutral-400 text-sm font-medium">
              {filter !== "all" ? `No ${filter} campaigns` : "No campaigns yet"}
            </p>
            <p className="text-neutral-600 text-xs mt-1">
              {filter !== "all"
                ? <button onClick={() => setFilter("all")} className="text-indigo-400 hover:underline">View all campaigns</button>
                : <>Create one via <Link href="/dashboard/offers" className="text-indigo-400 hover:underline">Offers</Link>.</>
              }
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800">
                {["Campaign", "Status", "Sent", "Contacts", "Reply Rate", "Meetings", "Created", "Vertical", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs text-neutral-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const status = deriveStatus(c);
                const s = statusConfig[status];
                const m = latestMetric(c);
                const href = c.offers?.slug
                  ? `/dashboard/offers/${c.offers.slug}/campaigns/${c.slug}`
                  : null;
                return (
                  <tr key={c.id} className="border-b border-neutral-800/60 last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      {href ? (
                        <Link href={href} className="block group/name">
                          <div className="font-medium text-white text-sm group-hover/name:text-indigo-300 transition-colors">{c.name}</div>
                          <div className="text-xs text-neutral-500 mt-0.5 font-mono">{c.slug}</div>
                        </Link>
                      ) : (
                        <>
                          <div className="font-medium text-white text-sm">{c.name}</div>
                          <div className="text-xs text-neutral-500 mt-0.5 font-mono">{c.slug}</div>
                        </>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border font-medium",
                        s.pillClass
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", s.dotClass)} />
                        {s.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-neutral-300">{m?.total_messages?.toLocaleString() ?? "—"}</td>
                    <td className="px-5 py-4 text-neutral-300">{m?.total_contacts?.toLocaleString() ?? "—"}</td>
                    <td className="px-5 py-4">
                      {m?.reply_rate ? (
                        <span className={m.reply_rate >= 0.05 ? "text-emerald-400 font-medium" : "text-neutral-300"}>
                          {pct(m.reply_rate)}
                        </span>
                      ) : <span className="text-neutral-600">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      {m?.total_meetings ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
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
                      {(() => {
                        const displayVertical = c.verticals?.name ?? c.offers?.verticals?.name ?? null;
                        const isInherited = !c.verticals?.name && !!c.offers?.verticals?.name;
                        return displayVertical ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 whitespace-nowrap">
                            {displayVertical}
                            {isInherited && <span className="text-indigo-400/50">(offer)</span>}
                          </span>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-4">
                      {href && (
                        <Link
                          href={href}
                          className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap"
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
