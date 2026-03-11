'use client';

import React from 'react';
import { CheckCircle2, FileText, Clock } from 'lucide-react';

export type SkillStatus = 'done' | 'running' | 'ready' | 'locked';

interface SkillStepCardProps {
  skillNum: number;
  title: string;
  description: string;
  cost?: string;
  status: SkillStatus;
  onRun?: () => void;
  isActive?: boolean;
  lastRunAt?: string | null;
  hasOutput?: boolean;
  isNext?: boolean;
}

const STATUS_CONFIG: Record<
  SkillStatus,
  { label: string; badgeClass: string; dotClass: string; ringClass: string }
> = {
  done: {
    label: 'Done',
    badgeClass: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    dotClass: 'bg-emerald-400',
    ringClass: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
  },
  running: {
    label: 'Running',
    badgeClass: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    dotClass: 'bg-yellow-400 animate-pulse',
    ringClass: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400',
  },
  ready: {
    label: 'Ready',
    badgeClass: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    dotClass: 'bg-blue-400',
    ringClass: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
  },
  locked: {
    label: 'Locked',
    badgeClass: 'text-neutral-600 bg-neutral-800/40 border-neutral-700',
    dotClass: 'bg-neutral-600',
    ringClass: 'bg-neutral-800 border-neutral-700 text-neutral-600',
  },
};

function formatTimeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function SkillStepCard({
  skillNum,
  title,
  description,
  cost,
  status,
  onRun,
  isActive,
  lastRunAt,
  hasOutput,
  isNext,
}: SkillStepCardProps) {
  const cfg = STATUS_CONFIG[status];
  const canRun = status === 'ready' || status === 'done';

  return (
    <div
      className={`relative flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all ${
        isActive
          ? 'border-yellow-500/40 bg-yellow-500/5 shadow-[0_0_0_1px_rgba(234,179,8,0.15)]'
          : isNext
          ? 'border-indigo-500/40 bg-indigo-500/5 shadow-[0_0_0_1px_rgba(99,102,241,0.1)]'
          : status === 'done'
          ? 'border-neutral-800 bg-neutral-900/60'
          : status === 'locked'
          ? 'border-neutral-800/60 bg-neutral-950/40'
          : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'
      }`}
    >
      {/* Step number / done check */}
      <div
        className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border ${cfg.ringClass}`}
      >
        {status === 'done' ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        ) : status === 'running' ? (
          <span className="animate-pulse">{skillNum}</span>
        ) : (
          skillNum
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-medium text-sm ${status === 'locked' ? 'text-neutral-600' : 'text-white'}`}>
            {title}
          </span>
          <span
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.badgeClass}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cfg.dotClass}`} />
            {cfg.label}
          </span>
          {isNext && status === 'ready' && (
            <span className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full font-medium">
              ← Next step
            </span>
          )}
        </div>
        <p className={`text-xs mt-0.5 leading-relaxed ${status === 'locked' ? 'text-neutral-700' : 'text-neutral-500'}`}>
          {description}
        </p>

        {/* Meta row: last run + output indicator */}
        {(lastRunAt || hasOutput || cost) && (
          <div className="flex items-center gap-3 mt-1.5">
            {cost && (
              <span className="text-xs text-neutral-600 font-mono">{cost}</span>
            )}
            {hasOutput && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-500/70">
                <FileText className="h-3 w-3" />
                Output ready
              </span>
            )}
            {lastRunAt && (
              <span className="inline-flex items-center gap-1 text-xs text-neutral-600">
                <Clock className="h-3 w-3" />
                Last run {formatTimeAgo(lastRunAt)}
              </span>
            )}
          </div>
        )}
        {cost && !lastRunAt && !hasOutput && (
          <div className="mt-1">
            <span className="text-xs text-neutral-600 font-mono">{cost}</span>
          </div>
        )}
      </div>

      {/* Action button */}
      {onRun && (
        <button
          onClick={onRun}
          disabled={status === 'locked' || status === 'running'}
          className={`flex-shrink-0 px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-all min-w-[68px] text-center ${
            status === 'running'
              ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 cursor-wait'
              : canRun
              ? 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white cursor-pointer shadow-sm shadow-indigo-500/20'
              : 'bg-neutral-900 border-neutral-800 text-neutral-700 cursor-not-allowed'
          }`}
        >
          {status === 'running'
            ? '…'
            : status === 'done'
            ? 'Re-run'
            : 'Run'}
        </button>
      )}
    </div>
  );
}
