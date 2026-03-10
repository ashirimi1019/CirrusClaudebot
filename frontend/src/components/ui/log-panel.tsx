'use client';

import React from 'react';

interface LogPanelProps {
  logs: string[];
  isRunning: boolean;
  exitCode?: number | null;
  logEndRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

export function LogPanel({ logs, isRunning, exitCode, logEndRef, className }: LogPanelProps) {
  if (logs.length === 0 && !isRunning) return null;

  return (
    <div className={`bg-gray-950 border border-gray-800 rounded-xl overflow-hidden ${className ?? ''}`}>
      {/* Terminal title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-800 bg-neutral-900/80">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-500/60" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/60" />
          <span className="h-3 w-3 rounded-full bg-green-500/60" />
        </div>
        <span className="text-xs text-gray-500 font-mono ml-2">Skill Output</span>
        <div className="ml-auto flex items-center gap-2">
          {isRunning && (
            <span className="flex items-center gap-1.5 text-xs text-yellow-400 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse" />
              running…
            </span>
          )}
          {!isRunning && exitCode !== null && (
            <span className={`text-xs font-mono ${exitCode === 0 ? 'text-green-400' : 'text-red-400'}`}>
              {exitCode === 0 ? '✓ exit 0' : `✗ exit ${exitCode}`}
            </span>
          )}
        </div>
      </div>

      {/* Log output */}
      <div className="h-80 overflow-y-auto p-4 space-y-0.5 scroll-smooth">
        {logs.map((line, i) => {
          // Colorize common patterns
          const isError = line.startsWith('❌') || line.toLowerCase().includes('error');
          const isSuccess = line.startsWith('✅') || line.startsWith('💾');
          const isInfo = line.startsWith('📋') || line.startsWith('🤖') || line.startsWith('📧') || line.startsWith('💼') || line.startsWith('📝') || line.startsWith('📖');
          const isDivider = line.startsWith('===') || line.startsWith('---');

          return (
            <div
              key={i}
              className={`font-mono text-xs leading-5 whitespace-pre-wrap break-all ${
                isError
                  ? 'text-red-400'
                  : isSuccess
                  ? 'text-green-400'
                  : isInfo
                  ? 'text-blue-300'
                  : isDivider
                  ? 'text-gray-600'
                  : 'text-gray-300'
              }`}
            >
              {line}
            </div>
          );
        })}
        {isRunning && (
          <div className="font-mono text-xs text-gray-600 animate-pulse">▋</div>
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}
