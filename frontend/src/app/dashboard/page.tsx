"use client";
import React from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

function StatCard({ label, value, delta, icon: Icon, color }: {
  label: string; value: string; delta: string; icon: React.ElementType; color: string;
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
      <div className="flex items-center gap-1 text-xs text-emerald-400">
        <TrendingUp className="h-3 w-3" />
        <span>{delta} vs last campaign</span>
      </div>
    </div>
  );
}

const campaigns = [
  { name: "Hiring 3 Eng Roles — Q1", offer: "Talent-as-a-Service", status: "active", sent: 342, openRate: "38%", replyRate: "6.4%", meetings: 8 },
  { name: "AI Platform Hiring — West", offer: "Talent-as-a-Service", status: "complete", sent: 218, openRate: "41%", replyRate: "8.1%", meetings: 12 },
  { name: "Cloud Migration Signal", offer: "Cloud Staff Aug", status: "draft", sent: 0, openRate: "—", replyRate: "—", meetings: 0 },
];

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  active: { label: "Active", icon: Circle, className: "text-emerald-400 fill-emerald-400" },
  complete: { label: "Complete", icon: CheckCircle2, className: "text-indigo-400" },
  draft: { label: "Draft", icon: AlertCircle, className: "text-neutral-500" },
};

const activity = [
  { icon: Search, color: "bg-indigo-500/20 text-indigo-400", text: "Skill 4 found 47 companies via Apollo", time: "2h ago" },
  { icon: Mail, color: "bg-violet-500/20 text-violet-400", text: "Sequence enrolled 312 contacts", time: "3h ago" },
  { icon: Target, color: "bg-rose-500/20 text-rose-400", text: "Campaign 'Hiring 3 Eng Roles' launched", time: "5h ago" },
  { icon: CheckCircle2, color: "bg-emerald-500/20 text-emerald-400", text: "Skill 3 generated 3 email variants", time: "6h ago" },
  { icon: BarChart3, color: "bg-amber-500/20 text-amber-400", text: "Sheets sync exported 428 rows", time: "1d ago" },
];

export default function DashboardPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-0.5">CirrusLabs GTM Engine · Signal-driven outbound</p>
        </div>
        <Link href="/dashboard/offers" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
          <Zap className="h-4 w-4" />
          Run Pipeline
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        <StatCard label="Companies Found" value="1,284" delta="+32%" icon={Building2} color="bg-indigo-500/20" />
        <StatCard label="Contacts" value="4,917" delta="+18%" icon={Users} color="bg-violet-500/20" />
        <StatCard label="Emails Sent" value="8,340" delta="+41%" icon={Mail} color="bg-rose-500/20" />
        <StatCard label="Avg Reply Rate" value="6.8%" delta="+1.2pp" icon={TrendingUp} color="bg-emerald-500/20" />
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Recent Campaigns</h2>
              <Link href="/dashboard/campaigns" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800">
                  {["Campaign", "Status", "Sent", "Open Rate", "Reply Rate", "Meetings"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs text-neutral-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => {
                  const s = statusConfig[c.status];
                  return (
                    <tr key={i} className="border-b border-neutral-800/60 last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-medium text-white text-sm">{c.name}</div>
                        <div className="text-xs text-neutral-500 mt-0.5">{c.offer}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={cn("inline-flex items-center gap-1.5 text-xs", s.className)}>
                          <s.icon className={cn("h-3 w-3", s.className)} />
                          {s.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-neutral-300">{c.sent || "—"}</td>
                      <td className="px-5 py-4 text-neutral-300">{c.openRate}</td>
                      <td className="px-5 py-4 text-neutral-300">{c.replyRate}</td>
                      <td className="px-5 py-4">
                        {c.meetings > 0 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400">{c.meetings} <ArrowUpRight className="h-3 w-3" /></span>
                        ) : <span className="text-neutral-600">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-800">
            <h2 className="text-sm font-semibold text-white">Activity</h2>
          </div>
          <ul className="divide-y divide-neutral-800/60">
            {activity.map((a, i) => (
              <li key={i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                <div className={cn("p-1.5 rounded-lg mt-0.5 flex-shrink-0", a.color)}>
                  <a.icon className="h-3.5 w-3.5" />
                </div>
                <p className="flex-1 text-sm text-neutral-300 leading-snug">{a.text}</p>
                <span className="text-xs text-neutral-600 flex-shrink-0 flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />{a.time}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
