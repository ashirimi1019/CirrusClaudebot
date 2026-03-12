'use client';

import { useState, useRef, useCallback } from 'react';

interface SkillRunnerState {
  logs: string[];
  isRunning: boolean;
  exitCode: number | null;
}

interface UseSkillRunnerReturn extends SkillRunnerState {
  run: () => void;
  reset: () => void;
  logEndRef: React.RefObject<HTMLDivElement | null>;
}

export function useSkillRunner(
  skill: number,
  offer: string,
  campaign: string,
  extraParams?: Record<string, string>,
): UseSkillRunnerReturn {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  const run = useCallback(() => {
    if (isRunning) return;
    // Close any existing connection
    esRef.current?.close();

    setLogs([]);
    setExitCode(null);
    setIsRunning(true);

    const params = new URLSearchParams({
      skill: String(skill),
      offer,
      campaign,
    });

    // Encode extra params (form data for Skills 1–2) as a JSON blob
    // Note: URLSearchParams already URL-encodes values, so we only JSON.stringify here
    if (extraParams && Object.keys(extraParams).length > 0) {
      params.set('formData', JSON.stringify(extraParams));
    }

    const url = `/api/skills/run?${params.toString()}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as {
          type: string;
          text?: string;
          code?: number;
          message?: string;
        };

        if (data.type === 'log' && data.text !== undefined) {
          setLogs((prev) => [...prev, data.text!]);
          scrollToBottom();
        } else if (data.type === 'done') {
          setExitCode(data.code ?? 0);
          setIsRunning(false);
          es.close();
        } else if (data.type === 'error') {
          setLogs((prev) => [...prev, `❌ Error: ${data.message}`]);
          setExitCode(1);
          setIsRunning(false);
          es.close();
        }
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      setLogs((prev) => [...prev, '❌ Connection lost']);
      setExitCode(1);
      setIsRunning(false);
      es.close();
    };
  }, [skill, offer, campaign, extraParams, isRunning, scrollToBottom]);

  const reset = useCallback(() => {
    esRef.current?.close();
    setLogs([]);
    setIsRunning(false);
    setExitCode(null);
  }, []);

  return { logs, isRunning, exitCode, run, reset, logEndRef };
}
