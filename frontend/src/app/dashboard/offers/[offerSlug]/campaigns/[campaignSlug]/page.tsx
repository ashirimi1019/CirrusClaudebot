'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  Users,
  Mail,
  BarChart2,
  Play,
} from 'lucide-react';
import { PipelineStepper, StatusData } from '@/components/ui/pipeline-stepper';
import { LogPanel } from '@/components/ui/log-panel';
import { createClient } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  title: string;
  email: string;
  company_name?: string;
}

// ─── Skill runner state (inline, not using hook so we can manage per-skill) ──

function useCampaignSkillRunner(offerSlug: string, campaignSlug: string) {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [runningSkill, setRunningSkill] = useState<number | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  const runSkill = useCallback(
    (skillNum: number) => {
      if (isRunning) return;
      esRef.current?.close();

      setLogs([]);
      setExitCode(null);
      setIsRunning(true);
      setRunningSkill(skillNum);

      const params = new URLSearchParams({
        skill: String(skillNum),
        offer: offerSlug,
        campaign: campaignSlug,
      });

      const es = new EventSource(`/api/skills/run?${params.toString()}`);
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
            setRunningSkill(null);
            es.close();
          } else if (data.type === 'error') {
            setLogs((prev) => [...prev, `❌ Error: ${data.message}`]);
            setIsRunning(false);
            setRunningSkill(null);
            es.close();
          }
        } catch {
          // ignore
        }
      };

      es.onerror = () => {
        setLogs((prev) => [...prev, '❌ Connection lost']);
        setIsRunning(false);
        setRunningSkill(null);
        es.close();
      };
    },
    [isRunning, offerSlug, campaignSlug, scrollToBottom],
  );

  return { logs, isRunning, exitCode, runningSkill, runSkill, logEndRef };
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'pipeline' | 'leads' | 'copy' | 'results';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'pipeline', label: 'Pipeline', icon: <Play className="h-3.5 w-3.5" /> },
  { id: 'leads', label: 'Leads', icon: <Users className="h-3.5 w-3.5" /> },
  { id: 'copy', label: 'Copy', icon: <Mail className="h-3.5 w-3.5" /> },
  { id: 'results', label: 'Results', icon: <BarChart2 className="h-3.5 w-3.5" /> },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CampaignDashboardPage() {
  const { offerSlug, campaignSlug } = useParams<{
    offerSlug: string;
    campaignSlug: string;
  }>();

  const [activeTab, setActiveTab] = useState<Tab>('pipeline');
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Leads tab
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

  const { logs, isRunning, exitCode, runningSkill, runSkill, logEndRef } =
    useCampaignSkillRunner(offerSlug, campaignSlug);

  // ── Fetch status ────────────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/skills/status?offer=${offerSlug}&campaign=${campaignSlug}`,
      );
      if (res.ok) {
        setStatusData(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setStatusLoading(false);
    }
  }, [offerSlug, campaignSlug]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Refresh status when a skill finishes
  useEffect(() => {
    if (!isRunning && exitCode !== null) {
      fetchStatus();
    }
  }, [isRunning, exitCode, fetchStatus]);

  // ── Fetch leads ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'leads') return;
    setLeadsLoading(true);
    const supabase = createClient();
    supabase
      .from('contacts')
      .select('id, first_name, last_name, title, email')
      .limit(50)
      .then(
        ({ data }) => {
          setLeads((data ?? []) as Lead[]);
          setLeadsLoading(false);
        },
        () => setLeadsLoading(false),
      );
  }, [activeTab]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-8 py-5 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-sm sticky top-0 z-10">
        <Link
          href={`/dashboard/offers/${offerSlug}`}
          className="text-gray-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-mono">{offerSlug}</span>
            <span className="text-gray-700">/</span>
            <h1 className="text-sm font-semibold text-white truncate">{campaignSlug}</h1>
          </div>
        </div>
        <button
          onClick={fetchStatus}
          disabled={statusLoading}
          className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-neutral-800 transition-all"
          title="Refresh status"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${statusLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tab nav */}
      <div className="flex items-center gap-1 px-8 pt-4 pb-0 border-b border-neutral-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-all -mb-px ${
              activeTab === tab.id
                ? 'text-indigo-400 border-indigo-500 bg-indigo-500/5'
                : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* ── Pipeline tab ─────────────────────────────────────────────────── */}
        {activeTab === 'pipeline' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="text-base font-semibold text-white mb-1">6-Skill Pipeline</h2>
              <p className="text-gray-500 text-xs">
                Run each skill in order. Completed steps turn green.{' '}
                <span className="text-yellow-500/80">
                  Skills 4 costs Apollo credits (~$2–5).
                </span>
              </p>
            </div>

            <PipelineStepper
              statusData={statusData}
              runningSkill={runningSkill}
              onRunSkill={runSkill}
            />

            {/* Log panel */}
            {(logs.length > 0 || isRunning) && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-medium">
                    {runningSkill ? `Skill ${runningSkill} output` : 'Last run output'}
                  </span>
                </div>
                <LogPanel
                  logs={logs}
                  isRunning={isRunning}
                  exitCode={exitCode}
                  logEndRef={logEndRef}
                />
              </div>
            )}

            {/* Help text when nothing is running */}
            {logs.length === 0 && !isRunning && (
              <div className="text-center py-8 text-gray-600 text-sm">
                Click <strong className="text-gray-400">Run</strong> on a step above to execute it.
                Output will stream here live.
              </div>
            )}
          </div>
        )}

        {/* ── Leads tab ────────────────────────────────────────────────────── */}
        {activeTab === 'leads' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h2 className="text-base font-semibold text-white mb-1">Leads</h2>
              <p className="text-gray-500 text-xs">
                Contacts discovered by Skill 4. Run Skill 4 first to populate this.
              </p>
            </div>

            {leadsLoading ? (
              <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
                Loading…
              </div>
            ) : leads.length === 0 ? (
              <div className="border border-dashed border-neutral-700 rounded-xl p-12 text-center">
                <Users className="h-8 w-8 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm mb-1">No leads found yet</p>
                <p className="text-gray-500 text-xs">
                  Run Skill 4 in the Pipeline tab to find companies + decision-makers.
                </p>
              </div>
            ) : (
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-800/50">
                    <tr>
                      {['Name', 'Title', 'Email'].map((h) => (
                        <th
                          key={h}
                          className="text-left text-xs font-medium text-gray-400 px-4 py-3"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-neutral-800/30 transition-colors">
                        <td className="px-4 py-3 text-white font-medium">
                          {lead.first_name} {lead.last_name}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{lead.title}</td>
                        <td className="px-4 py-3 text-blue-400 text-xs font-mono">
                          {lead.email}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Copy tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'copy' && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h2 className="text-base font-semibold text-white mb-1">Campaign Copy</h2>
              <p className="text-gray-500 text-xs">
                Email and LinkedIn variants generated by Skill 3.
              </p>
            </div>

            {!statusData?.skill3 ? (
              <div className="border border-dashed border-neutral-700 rounded-xl p-12 text-center">
                <Mail className="h-8 w-8 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm mb-1">Copy not generated yet</p>
                <p className="text-gray-500 text-xs">
                  Run Skill 3 in the Pipeline tab to generate email and LinkedIn variants.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl">
                  <p className="text-sm text-gray-300 mb-2">
                    Copy files are saved to:
                  </p>
                  <code className="text-xs text-green-400 font-mono block bg-gray-950 p-3 rounded-lg">
                    offers/{offerSlug}/campaigns/{campaignSlug}/copy/
                  </code>
                  <ul className="mt-3 space-y-1 text-xs text-gray-400">
                    <li>• email-variants.md — 3 subject + body variants</li>
                    <li>• linkedin-variants.md — 3 DM variants</li>
                    <li>• personalization-notes.md — placeholder guide</li>
                  </ul>
                </div>
                <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                  <p className="text-xs text-green-400 font-medium">
                    ✅ Copy generated — open the files above in your editor to review and edit.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Results tab ──────────────────────────────────────────────────── */}
        {activeTab === 'results' && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h2 className="text-base font-semibold text-white mb-1">Campaign Results</h2>
              <p className="text-gray-500 text-xs">
                Learnings generated by Skill 6 after campaign analysis.
              </p>
            </div>

            {!statusData?.skill6 ? (
              <div className="border border-dashed border-neutral-700 rounded-xl p-12 text-center">
                <BarChart2 className="h-8 w-8 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm mb-1">No results yet</p>
                <p className="text-gray-500 text-xs">
                  After launching your campaign in Apollo, run Skill 6 to analyze results and
                  update learnings.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl">
                  <p className="text-sm text-gray-300 mb-2">Results saved to:</p>
                  <code className="text-xs text-green-400 font-mono block bg-gray-950 p-3 rounded-lg">
                    offers/{offerSlug}/campaigns/{campaignSlug}/results/learnings.md
                  </code>
                </div>
                <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                  <p className="text-xs text-green-400 font-medium">
                    ✅ Results saved — learnings also updated in context/learnings/what-works.md
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
