'use client';

import React from 'react';

export type SkillStatus = 'done' | 'running' | 'ready' | 'locked';

interface SkillStepCardProps {
  skillNum: number;
  title: string;
  description: string;
  cost?: string;
  status: SkillStatus;
  onRun?: () => void;
  isActive?: boolean;
}

const STATUS_CONFIG: Record<
  SkillStatus,
  { label: string; badgeClass: string; dotClass: string; ringClass: string }
> = {
  done: {
    label: 'Done',
    badgeClass: 'text-green-400 bg-green-400/10 border-green-400/20',
    dotClass: 'bg-green-400',
    ringClass: 'bg-green-500/20 border-green-500/40 text-green-400',
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
    badgeClass: 'text-gray-500 bg-gray-700/30 border-gray-700',
    dotClass: 'bg-gray-600',
    ringClass: 'bg-gray-800 border-gray-700 text-gray-500',
  },
};

export function SkillStepCard({
  skillNum,
  title,
  description,
  cost,
  status,
  onRun,
  isActive,
}: SkillStepCardProps) {
  const cfg = STATUS_CONFIG[status];
  const canRun = status === 'ready' || status === 'done';

  return (
    <div
      className={`relative flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all ${
        isActive
          ? 'border-indigo-500/50 bg-indigo-500/5'
          : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'
      }`}
    >
      {/* Step number badge */}
      <div
        className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border ${cfg.ringClass}`}
      >
        {status === 'done' ? '✓' : skillNum}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-white text-sm">{title}</span>
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.badgeClass}`}>
            <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${cfg.dotClass}`} />
            {cfg.label}
          </span>
          {cost && (
            <span className="text-xs text-gray-500 ml-auto font-mono">{cost}</span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
      </div>

      {/* Run / Re-run button */}
      {onRun && (
        <button
          onClick={onRun}
          disabled={!canRun}
          className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
            status === 'running'
              ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 cursor-wait'
              : canRun
              ? 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white cursor-pointer'
              : 'bg-neutral-800 border-neutral-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {status === 'running' ? '…' : status === 'done' ? 'Re-run' : 'Run'}
        </button>
      )}
    </div>
  );
}
