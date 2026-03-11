'use client';

import React from 'react';

interface LogPanelProps {
  logs: string[];
  isRunning: boolean;
  exitCode?: number | null;
  logEndRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
  skillName?: string;
}

export function LogPanel({ logs, isRunning, exitCode, logEndRef, className, skillName }: LogPanelProps) {
  if (logs.length === 0 && !isRunning) return null;

  const titleText = skillName ? `Skill Output — ${skillName}` : 'Skill Output';

  return (
    <div className={`bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-xl ${className ?? ''}`}>
      {/* Terminal title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-800 bg-neutral-900/80">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-500/50" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/50" />
          <span className="h-3 w-3 rounded-full bg-green-500/50" />
        </div>
        <span className="text-xs text-neutral-500 font-mono ml-2 flex-1">{titleText}</span>
        <div className="flex items-center gap-3">
          {isRunning && (
            <span className="flex items-center gap-1.5 text-xs text-yellow-400 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
              running…
            </span>
          )}
          {!isRunning && exitCode !== null && exitCode !== undefined && (
            <span
              className={`text-xs font-mono px-2 py-0.5 rounded ${
                exitCode === 0
                  ? 'text-emerald-400 bg-emerald-400/10'
                  : 'text-red-400 bg-red-400/10'
              }`}
            >
              {exitCode === 0 ? '✓ Completed' : `✗ Failed (exit ${exitCode})`}
            </span>
          )}
          <span className="text-xs text-neutral-700 font-mono">
            {logs.length} line{logs.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Log output */}
      <div className="h-80 overflow-y-auto p-4 space-y-0.5 scroll-smooth">
        {logs.map((line, i) => {
          const isError = line.startsWith('❌') || line.toLowerCase().includes('error:');
          const isSuccess = line.startsWith('✅') || line.startsWith('💾') || line.startsWith('✓');
          const isInfo =
            line.startsWith('📋') ||
            line.startsWith('🤖') ||
            line.startsWith('📧') ||
            line.startsWith('💼') ||
            line.startsWith('📝') ||
            line.startsWith('📖') ||
            line.startsWith('🔍') ||
            line.startsWith('🚀');
          const isWarning = line.startsWith('⚠️') || line.toLowerCase().startsWith('warn');
          const isDivider = line.startsWith('===') || line.startsWith('---');

          return (
            <div
              key={i}
              className={`font-mono text-xs leading-5 whitespace-pre-wrap break-all ${
                isError
                  ? 'text-red-400'
                  : isWarning
                  ? 'text-yellow-400/80'
                  : isSuccess
                  ? 'text-emerald-400'
                  : isInfo
                  ? 'text-blue-300'
                  : isDivider
                  ? 'text-neutral-700'
                  : 'text-neutral-300'
              }`}
            >
              {line || '\u00A0'}
            </div>
          );
        })}
        {isRunning && (
          <div className="font-mono text-xs text-neutral-600 animate-pulse">▋</div>
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}
