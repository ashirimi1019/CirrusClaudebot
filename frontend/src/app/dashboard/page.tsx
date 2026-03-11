"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  Building2,
  BarChart3,
  Target,
  Zap,
  TrendingUp,
  Mail,
  Search,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Circle,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  companies: number;
  contacts: number;
  campaigns: number;
  activeCampaigns: number;
}

interface RecentCampaign {
  id: string;
  slug: string;
  name: string | null;
  status: string;
  offer_slug: string;
  offer_name: string | null;
  total_contacts: number;
  total_messages: number;
  reply_rate: number | null;
  total_meetings: number;
}

interface RecentRun {
  id: string;
  skill_number: number;
  status: string;
  started_at: string;
  campaign_slug: string | null;
  offer_slug: string | null;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  loading,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500 uppercase tracking-wider">{label}</span>
        <div className={cn("p-1.5 rounded-lg", color)}>
          <Icon className="h-3.5 w-3.5 text-white/80" />
        </div>
      </div>
      {loading ? (
        <div className="h-8 flex items-center">
          <Loader2 className="h-4 w-4 animate-spin text-neutral-600" />
        </div>
      ) : (
        <div className="text-2xl font-bold text-white">
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
      )}
    </div>
  );
}

const statusConfig: Record<
  string,
  { label: string; icon: React.ElementType; className: string }
> = {
  active: {
    label: "Active",
    icon: Circle,
    className: "text-emerald-400 fill-emerald-400",
  },
  complete: {
    label: "Complete",
    icon: CheckCircle2,
    className: "text-indigo-400",
  },
  draft: {
    label: "Draft",
    icon: AlertCircle,
    className: "text-neutral-500",
  },
  paused: {
    label: "Paused",
    icon: AlertCircle,
    className: "text-yellow-500",
  },
};

const SKILL_LABELS: Record<number, { label: string; icon: React.ElementType; color: string }> = {
  1: { label: "Offer created", icon: Target, color: "bg-indigo-500/20 text-indigo-400" },
  2: { label: "Campaign strategy designed", icon: BarChart3, color: "bg-violet-500/20 text-violet-400" },
  3: { label: "Email copy generated", icon: Mail, color: "bg-rose-500/20 text-rose-400" },
  4: { label: "Leads discovered via Apollo", icon: Search, color: "bg-amber-500/20 text-amber-400" },
  5: { label: "Outreach messages built", icon: Mail, color: "bg-blue-500/20 text-blue-400" },
  6: { label: "Campaign review completed", icon: CheckCircle2, color: "bg-emerald-500/20 text-emerald-400" },
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ companies: 0, contacts: 0, campaigns: 0, activeCampaigns: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<RecentCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [runs, setRuns] = useState<RecentRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Load stats in parallel
    Promise.all([
      supabase.from("companies").select("id", { count: "exact", head: true }),
      supabase.from("contacts").select("id", { count: "exact", head: true }),
      supabase.from("campaigns").select("id, status", { count: "exact" }),
    ]).then(([comp, cont, camps]) => {
      const campData = camps.data ?? [];
      setStats({
        companies: comp.count ?? 0,
        contacts: cont.count ?? 0,
        campaigns: camps.count ?? 0,
        activeCampaigns: campData.filter((c: { status: string }) => c.status === "active").length,
      });
      setStatsLoading(false);
    });

    // Load recent campaigns with metrics
    supabase
      .from("campaigns")
      .select(`
        id, slug, name, status,
        offers ( slug, name ),
        campaign_metrics ( total_contacts, total_messages, reply_rate, total_meetings )
      `)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }: {
        data: Array<{
          id: string;
          slug: string;
          name: string | null;
          status: string;
          offers: { slug: string; name: string | null } | null;
          campaign_metrics: { total_contacts: number; total_messages: number; reply_rate: number | null; total_meetings: number }[] | null;
        }> | null;
      }) => {
        const mapped: RecentCampaign[] = (data ?? []).map((c) => {
          const m = c.campaign_metrics?.[0];
          return {
            id: c.id,
            slug: c.slug,
            name: c.name,
            status: c.status,
            offer_slug: c.offers?.slug ?? "",
            offer_name: c.offers?.name ?? null,
            total_contacts: m?.total_contacts ?? 0,
            total_messages: m?.total_messages ?? 0,
            reply_rate: m?.reply_rate ?? null,
            total_meetings: m?.total_meetings ?? 0,
          };
        });
        setCampaigns(mapped);
        setCampaignsLoading(false);
      });

    // Load recent skill runs
    supabase
      .from("skill_runs")
      .select(`
        id, skill_number, status, started_at,
        campaigns ( slug, offers ( slug ) )
      `)
      .order("started_at", { ascending: false })
      .limit(8)
      .then(({ data }: {
        data: Array<{
          id: string;
          skill_number: number;
          status: string;
          started_at: string;
          campaigns: { slug: string; offers: { slug: string } | null } | null;
        }> | null;
      }) => {
        const mapped: RecentRun[] = (data ?? []).map((r) => ({
          id: r.id,
          skill_number: r.skill_number,
          status: r.status,
          started_at: r.started_at,
          campaign_slug: r.campaigns?.slug ?? null,
          offer_slug: r.campaigns?.offers?.slug ?? null,
        }));
        setRuns(mapped);
        setRunsLoading(false);
      });
  }, []);

  function timeAgo(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            CirrusLabs GTM Engine · Signal-driven outbound
          </p>
        </div>
        <Link
          href="/dashboard/offers"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          <Zap className="h-4 w-4" />
          Run Pipeline
        </Link>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        <StatCard
          label="Companies Found"
          value={stats.companies}
          icon={Building2}
          color="bg-indigo-500/20"
          loading={statsLoading}
        />
        <StatCard
          label="Contacts"
          value={stats.contacts}
          icon={Users}
          color="bg-violet-500/20"
          loading={statsLoading}
        />
        <StatCard
          label="Campaigns"
          value={stats.campaigns}
          icon={BarChart3}
          color="bg-rose-500/20"
          loading={statsLoading}
        />
        <StatCard
          label="Active Campaigns"
          value={stats.activeCampaigns}
          icon={TrendingUp}
          color="bg-emerald-500/20"
          loading={statsLoading}
        />
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent Campaigns */}
        <div className="lg:col-span-2">
          <div className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Recent Campaigns</h2>
              <Link
                href="/dashboard/campaigns"
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {campaignsLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-neutral-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-xs">Loading campaigns…</span>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="py-14 text-center">
                <Target className="h-8 w-8 text-neutral-700 mx-auto mb-3" />
                <p className="text-neutral-400 text-sm font-medium">No campaigns yet</p>
                <p className="text-neutral-600 text-xs mt-1">
                  <Link href="/dashboard/offers" className="text-indigo-400 hover:underline">
                    Create your first offer →
                  </Link>
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-800">
                    {["Campaign", "Status", "Contacts", "Reply Rate", "Meetings"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-xs text-neutral-500 font-medium"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => {
                    const s = statusConfig[c.status] ?? statusConfig.draft;
                    return (
                      <tr
                        key={c.id}
                        className="border-b border-neutral-800/60 last:border-0 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={`/dashboard/offers/${c.offer_slug}/campaigns/${c.slug}`}
                            className="font-medium text-white text-sm hover:text-indigo-300 transition-colors"
                          >
                            {c.name ?? c.slug}
                          </Link>
                          <div className="text-xs text-neutral-500 mt-0.5">
                            {c.offer_name ?? c.offer_slug}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={cn("inline-flex items-center gap-1.5 text-xs", s.className)}>
                            <s.icon className={cn("h-3 w-3", s.className)} />
                            {s.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-neutral-300">
                          {c.total_contacts > 0 ? c.total_contacts.toLocaleString() : "—"}
                        </td>
                        <td className="px-5 py-4 text-neutral-300">
                          {c.reply_rate != null
                            ? `${(c.reply_rate * 100).toFixed(1)}%`
                            : "—"}
                        </td>
                        <td className="px-5 py-4">
                          {c.total_meetings > 0 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400">
                              {c.total_meetings}{" "}
                              <ArrowUpRight className="h-3 w-3" />
                            </span>
                          ) : (
                            <span className="text-neutral-600">—</span>
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

        {/* Recent Activity (skill runs) */}
        <div className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-800">
            <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
          </div>

          {runsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-neutral-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-xs">Loading activity…</span>
            </div>
          ) : runs.length === 0 ? (
            <div className="py-14 text-center">
              <Zap className="h-8 w-8 text-neutral-700 mx-auto mb-3" />
              <p className="text-neutral-400 text-sm font-medium">No activity yet</p>
              <p className="text-neutral-600 text-xs mt-1">
                Run a skill from the Pipeline tab to see activity here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-800/60">
              {runs.map((r) => {
                const meta = SKILL_LABELS[r.skill_number] ?? {
                  label: `Skill ${r.skill_number}`,
                  icon: Zap,
                  color: "bg-neutral-700 text-neutral-400",
                };
                const Icon = meta.icon;
                const statusDot =
                  r.status === "success"
                    ? "text-emerald-400"
                    : r.status === "failed"
                    ? "text-red-400"
                    : "text-yellow-400 animate-pulse";
                return (
                  <li
                    key={r.id}
                    className="flex items-start gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className={cn("p-1.5 rounded-lg mt-0.5 flex-shrink-0", meta.color)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-300 leading-snug truncate">
                        <span className={cn("mr-1 text-xs", statusDot)}>●</span>
                        Skill {r.skill_number} — {meta.label}
                      </p>
                      {r.campaign_slug && (
                        <p className="text-xs text-neutral-600 truncate mt-0.5">
                          {r.offer_slug}/{r.campaign_slug}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-neutral-600 flex-shrink-0 flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {timeAgo(r.started_at)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
