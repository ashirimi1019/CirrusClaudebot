"use client";
import React, { useEffect, useState } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  FileSpreadsheet,
  Zap,
  Inbox,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type Artifact = {
  id: string;
  file_name: string;
  file_type: string;
  category: string;
  file_size_bytes: number | null;
  created_at: string;
};

type SkillRun = {
  id: string;
  skill_number: number;
  status: string;
  exit_code: number | null;
  log_lines: string[] | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  offer_id: string | null;
  campaign_id: string | null;
  offers: { name: string; slug: string } | null;
  campaigns: { name: string; slug: string } | null;
  artifacts: Artifact[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SKILL_NAMES: Record<number, string> = {
  1: "New Offer",
  2: "Campaign Strategy",
  3: "Campaign Copy",
  4: "Find Leads",
  5: "Launch Outreach",
  6: "Campaign Review",
};

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config = {
    success: {
      icon: CheckCircle2,
      label: "Success",
      className: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    },
    failed: {
      icon: XCircle,
      label: "Failed",
      className: "text-rose-400 bg-rose-400/10 border-rose-400/20",
    },
    running: {
      icon: Loader2,
      label: "Running",
      className: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    },
  }[status] ?? {
    icon: Clock,
    label: status,
    className: "text-neutral-500 bg-neutral-800/40 border-neutral-700",
  };

  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border",
        config.className,
      )}
    >
      <Icon className={cn("h-3 w-3", status === "running" && "animate-spin")} />
      {config.label}
    </span>
  );
}

// ─── Run card ────────────────────────────────────────────────────────────────

function RunCard({ run }: { run: SkillRun }) {
  const [expanded, setExpanded] = useState(false);

  const offerName = run.offers?.name ?? "—";
  const campaignName = run.campaigns?.name;
  const Arrow = expanded ? ChevronDown : ChevronRight;

  return (
    <div className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex-shrink-0">
          <Zap className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">
              Skill {run.skill_number}: {SKILL_NAMES[run.skill_number] ?? "Unknown"}
            </span>
            <StatusBadge status={run.status} />
          </div>
          <div className="text-xs text-neutral-500 mt-0.5 truncate">
            {offerName}
            {campaignName && ` → ${campaignName}`}
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          <span className="text-xs text-neutral-600 font-mono">
            {formatDuration(run.duration_ms)}
          </span>
          <span className="text-xs text-neutral-600">
            {formatTime(run.started_at)}
          </span>
          <Arrow className="h-4 w-4 text-neutral-600" />
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-neutral-800/60">
          {/* Artifacts */}
          {run.artifacts.length > 0 && (
            <div className="px-5 py-3 border-b border-neutral-800/40">
              <div className="text-xs text-neutral-500 mb-2 font-medium uppercase tracking-wider">
                Generated Files
              </div>
              <div className="space-y-1.5">
                {run.artifacts.map((art) => {
                  const Icon = art.file_type === "csv" ? FileSpreadsheet : FileText;
                  return (
                    <div
                      key={art.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="h-3.5 w-3.5 text-neutral-500 flex-shrink-0" />
                        <span className="text-xs text-neutral-300 truncate">
                          {art.file_name}
                        </span>
                        {art.file_size_bytes && (
                          <span className="text-xs text-neutral-600">
                            ({formatBytes(art.file_size_bytes)})
                          </span>
                        )}
                      </div>
                      <a
                        href={`/api/artifacts/${art.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex-shrink-0"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Log output */}
          {run.log_lines && run.log_lines.length > 0 && (
            <div className="px-5 py-3">
              <div className="text-xs text-neutral-500 mb-2 font-medium uppercase tracking-wider">
                Log Output ({run.log_lines.length} lines)
              </div>
              <div className="bg-neutral-950 rounded-lg border border-neutral-800/60 p-3 max-h-60 overflow-y-auto font-mono text-xs text-neutral-400 space-y-0.5">
                {run.log_lines.slice(0, 100).map((line, i) => (
                  <div key={i} className="whitespace-pre-wrap break-all">
                    {line}
                  </div>
                ))}
                {run.log_lines.length > 100 && (
                  <div className="text-neutral-600 pt-1">
                    ... {run.log_lines.length - 100} more lines
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No details */}
          {(!run.artifacts.length && (!run.log_lines || !run.log_lines.length)) && (
            <div className="px-5 py-4 text-xs text-neutral-600">
              No artifacts or logs recorded for this run.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-xl bg-neutral-900 border border-neutral-800 h-[72px] animate-pulse"
        />
      ))}
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-12 flex flex-col items-center justify-center text-center">
      <div className="h-12 w-12 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
        <Inbox className="h-6 w-6 text-neutral-600" />
      </div>
      <h3 className="text-sm font-medium text-neutral-400 mb-1">
        No activity yet
      </h3>
      <p className="text-xs text-neutral-600 max-w-xs">
        Skill runs and generated artifacts will appear here after you run your
        first campaign skill.
      </p>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const [runs, setRuns] = useState<SkillRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = createClient();

    sb.from("skill_runs")
      .select(
        `
        id,
        skill_number,
        status,
        exit_code,
        log_lines,
        started_at,
        finished_at,
        duration_ms,
        offer_id,
        campaign_id,
        offers ( name, slug ),
        campaigns ( name, slug ),
        artifacts (
          id,
          file_name,
          file_type,
          category,
          file_size_bytes,
          created_at
        )
      `,
      )
      .order("started_at", { ascending: false })
      .limit(50)
      .then(({ data }: { data: unknown }) => {
        setRuns((data as SkillRun[]) ?? []);
        setLoading(false);
      });
  }, []);

  // Aggregate stats
  const totalRuns = runs.length;
  const successRuns = runs.filter((r) => r.status === "success").length;
  const totalArtifacts = runs.reduce((sum, r) => sum + r.artifacts.length, 0);

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock className="h-5 w-5 text-neutral-400" />
          Activity
        </h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          Skill run history and generated artifacts
        </p>
      </div>

      {/* Stats row */}
      {!loading && totalRuns > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total Runs", value: totalRuns },
            { label: "Successful", value: successRuns },
            { label: "Files Generated", value: totalArtifacts },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl bg-neutral-900 border border-neutral-800 px-5 py-4"
            >
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-xs text-neutral-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Runs list */}
      {loading ? (
        <Skeleton />
      ) : runs.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}
