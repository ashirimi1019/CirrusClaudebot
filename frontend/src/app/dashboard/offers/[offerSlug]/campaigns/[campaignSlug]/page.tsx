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
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { PipelineStepper, StatusData } from '@/components/ui/pipeline-stepper';
import { LogPanel } from '@/components/ui/log-panel';
import { createClient } from '@/lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CampaignLead {
  id: string;
  first_name: string;
  last_name: string;
  title: string;
  email: string;
  linkedin_url: string | null;
  fit_score: number;
  outreach_status: string;
  companies: { name: string; domain: string; fit_score: number } | null;
}

interface MessageVariant {
  id: string;
  channel: 'email' | 'linkedin';
  variant_name: string;
  subject_line: string | null;
  body: string | null;
  framework_used: string | null;
  created_at: string;
}

interface SkillRun {
  id: string;
  skill_number: number;
  status: 'running' | 'success' | 'failed';
  exit_code: number | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  log_lines: string[] | null;
}

interface CampaignMetrics {
  total_companies: number;
  total_contacts: number;
  total_messages: number;
  total_replies: number;
  total_meetings: number;
  reply_rate: number | null;
  meeting_rate: number | null;
}

// ─── CopyButton ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="ml-1 text-neutral-600 hover:text-neutral-300 transition-colors"
      title="Copy"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

// ─── Skill runner hook ────────────────────────────────────────────────────────

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

// ─── SkillRun row ─────────────────────────────────────────────────────────────

function SkillRunRow({ run }: { run: SkillRun }) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon =
    run.status === 'success' ? (
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
    ) : run.status === 'failed' ? (
      <XCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
    ) : (
      <Loader2 className="h-3.5 w-3.5 text-yellow-400 animate-spin flex-shrink-0" />
    );

  const duration = run.duration_ms != null
    ? run.duration_ms < 1000
      ? `${run.duration_ms}ms`
      : `${(run.duration_ms / 1000).toFixed(1)}s`
    : null;

  return (
    <div className="border border-neutral-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-800/40 transition-colors text-left"
      >
        {statusIcon}
        <span className="text-xs font-medium text-white flex-1">
          Skill {run.skill_number}
        </span>
        {duration && (
          <span className="text-xs text-neutral-500 flex items-center gap-1">
            <Clock className="h-3 w-3" /> {duration}
          </span>
        )}
        <span className="text-xs text-neutral-600">
          {new Date(run.started_at).toLocaleString()}
        </span>
        {(run.log_lines?.length ?? 0) > 0 && (
          expanded
            ? <ChevronDown className="h-3.5 w-3.5 text-neutral-500" />
            : <ChevronRight className="h-3.5 w-3.5 text-neutral-500" />
        )}
      </button>
      {expanded && (run.log_lines?.length ?? 0) > 0 && (
        <div className="border-t border-neutral-800 bg-neutral-950 px-3 py-2 max-h-48 overflow-y-auto">
          {run.log_lines!.map((line, i) => (
            <div key={i} className="text-xs font-mono text-neutral-400 leading-5 whitespace-pre-wrap">
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

  // Copy tab
  const [variants, setVariants] = useState<MessageVariant[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);

  // Results tab
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Run history
  const [skillRuns, setSkillRuns] = useState<SkillRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);

  const { logs, isRunning, exitCode, runningSkill, runSkill, logEndRef } =
    useCampaignSkillRunner(offerSlug, campaignSlug);

  // ── Resolve campaign ID from slugs ─────────────────────────────────────────
  const [campaignId, setCampaignId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('offers')
      .select('id')
      .eq('slug', offerSlug)
      .single()
      .then(({ data: offer }: { data: { id: string } | null }) => {
        if (!offer) return;
        supabase
          .from('campaigns')
          .select('id')
          .eq('offer_id', offer.id)
          .eq('slug', campaignSlug)
          .single()
          .then(({ data: campaign }: { data: { id: string } | null }) => {
            if (campaign) setCampaignId(campaign.id);
          });
      });
  }, [offerSlug, campaignSlug]);

  // ── Fetch status ────────────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
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

  // Refresh status + run history when a skill finishes
  useEffect(() => {
    if (!isRunning && exitCode !== null) {
      fetchStatus();
      if (campaignId) fetchRunHistory(campaignId);
    }
  }, [isRunning, exitCode, fetchStatus, campaignId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch run history ───────────────────────────────────────────────────────
  const fetchRunHistory = useCallback(async (cId: string) => {
    setRunsLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('skill_runs')
      .select('id, skill_number, status, exit_code, started_at, finished_at, duration_ms, log_lines')
      .eq('campaign_id', cId)
      .order('started_at', { ascending: false })
      .limit(30);
    setSkillRuns((data as SkillRun[]) ?? []);
    setRunsLoading(false);
  }, []);

  useEffect(() => {
    if (campaignId) fetchRunHistory(campaignId);
  }, [campaignId, fetchRunHistory]);

  // ── Fetch leads (campaign-scoped) ───────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'leads' || !campaignId) return;
    setLeadsLoading(true);
    const supabase = createClient();
    supabase
      .from('campaign_contacts')
      .select(`
        id,
        outreach_status,
        contacts (
          id, first_name, last_name, title, email, linkedin_url, fit_score,
          companies ( name, domain, fit_score )
        )
      `)
      .eq('campaign_id', campaignId)
      .limit(200)
      .then(({ data }: {
        data: Array<{
          id: string;
          outreach_status: string;
          contacts: {
            id: string;
            first_name: string;
            last_name: string;
            title: string;
            email: string;
            linkedin_url: string | null;
            fit_score: number;
            companies: { name: string; domain: string; fit_score: number } | null;
          } | null;
        }> | null;
      }) => {
        const mapped: CampaignLead[] = (data ?? []).map((row) => ({
          id: row.contacts?.id ?? row.id,
          first_name: row.contacts?.first_name ?? '',
          last_name: row.contacts?.last_name ?? '',
          title: row.contacts?.title ?? '',
          email: row.contacts?.email ?? '',
          linkedin_url: row.contacts?.linkedin_url ?? null,
          fit_score: row.contacts?.fit_score ?? 0,
          outreach_status: row.outreach_status,
          companies: row.contacts?.companies ?? null,
        }));
        setLeads(mapped);
        setLeadsLoading(false);
      });
  }, [activeTab, campaignId]);

  // ── Fetch message variants ──────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'copy' || !campaignId) return;
    setVariantsLoading(true);
    const supabase = createClient();
    supabase
      .from('message_variants')
      .select('id, channel, variant_name, subject_line, body, framework_used, created_at')
      .eq('campaign_id', campaignId)
      .order('channel')
      .order('created_at')
      .then(({ data }: { data: MessageVariant[] | null }) => {
        setVariants(data ?? []);
        setVariantsLoading(false);
      });
  }, [activeTab, campaignId]);

  // ── Fetch campaign metrics ──────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'results' || !campaignId) return;
    setMetricsLoading(true);
    const supabase = createClient();
    supabase
      .from('campaign_metrics')
      .select('total_companies, total_contacts, total_messages, total_replies, total_meetings, reply_rate, meeting_rate')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }: { data: CampaignMetrics | null }) => {
        setMetrics(data);
        setMetricsLoading(false);
      });
  }, [activeTab, campaignId]);

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

        {/* ── Pipeline tab ──────────────────────────────────────────────────── */}
        {activeTab === 'pipeline' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="text-base font-semibold text-white mb-1">6-Skill Pipeline</h2>
              <p className="text-gray-500 text-xs">
                Run each skill in order. Completed steps turn green.{' '}
                <span className="text-yellow-500/80">
                  Skill 4 costs Apollo credits (~$2–5).
                </span>
              </p>
            </div>

            <PipelineStepper
              statusData={statusData}
              runningSkill={runningSkill}
              onRunSkill={runSkill}
            />

            {/* Live log panel */}
            {(logs.length > 0 || isRunning) && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-medium">
                    {runningSkill ? `Skill ${runningSkill} — live output` : 'Last run output'}
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
              <div className="text-center py-6 text-gray-600 text-sm">
                Click <strong className="text-gray-400">Run</strong> on a step above to execute it.
                Output will stream here live.
              </div>
            )}

            {/* ── Run history ─────────────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Run History
                </h3>
                {campaignId && (
                  <button
                    onClick={() => fetchRunHistory(campaignId)}
                    className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    Refresh
                  </button>
                )}
              </div>

              {runsLoading ? (
                <div className="flex items-center gap-2 text-neutral-500 text-xs py-4">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading history…
                </div>
              ) : skillRuns.length === 0 ? (
                <p className="text-xs text-neutral-600 py-4">
                  No runs recorded yet. Execute a skill above to start.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {skillRuns.map((run) => (
                    <SkillRunRow key={run.id} run={run} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Leads tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'leads' && (
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold text-white mb-1">Leads</h2>
                <p className="text-gray-500 text-xs">
                  {leads.length > 0
                    ? `${leads.length} contacts in this campaign`
                    : 'Contacts discovered by Skill 4 for this campaign.'}
                </p>
              </div>
              {leads.length > 0 && (
                <button
                  onClick={() => {
                    const csv = [
                      'First Name,Last Name,Title,Company,Domain,Email,LinkedIn,ICP Score,Status',
                      ...leads.map((l) =>
                        [
                          l.first_name,
                          l.last_name,
                          l.title,
                          l.companies?.name ?? '',
                          l.companies?.domain ?? '',
                          l.email,
                          l.linkedin_url ?? '',
                          l.fit_score,
                          l.outreach_status,
                        ].join(','),
                      ),
                    ].join('\n');
                    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${campaignSlug}-leads.csv`;
                    a.click();
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white text-xs font-medium transition-colors"
                >
                  Export CSV
                </button>
              )}
            </div>

            {leadsLoading ? (
              <div className="flex items-center justify-center h-48 text-gray-500 text-sm gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : leads.length === 0 ? (
              <div className="border border-dashed border-neutral-700 rounded-xl p-12 text-center">
                <Users className="h-8 w-8 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm mb-1">No leads in this campaign yet</p>
                <p className="text-gray-500 text-xs">
                  Run Skill 4 in the Pipeline tab to find companies + decision-makers.
                </p>
              </div>
            ) : (
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-800/50">
                    <tr>
                      {['Name', 'Title', 'Company', 'Email', 'ICP Score', 'Status'].map((h) => (
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
                      <tr key={lead.id} className="hover:bg-neutral-800/30 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="text-white font-medium text-sm">
                            {lead.first_name} {lead.last_name}
                          </div>
                          {lead.linkedin_url && (
                            <a
                              href={lead.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 text-xs hover:text-blue-400 flex items-center gap-0.5"
                            >
                              LinkedIn <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs max-w-[160px] truncate">
                          {lead.title || '—'}
                        </td>
                        <td className="px-4 py-3">
                          {lead.companies ? (
                            <div>
                              <div className="text-neutral-300 text-sm">{lead.companies.name}</div>
                              <div className="text-neutral-600 text-xs font-mono">{lead.companies.domain}</div>
                            </div>
                          ) : (
                            <span className="text-neutral-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {lead.email ? (
                            <span className="flex items-center text-xs font-mono text-neutral-300">
                              {lead.email}
                              <CopyButton text={lead.email} />
                            </span>
                          ) : (
                            <span className="text-neutral-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs font-semibold ${
                              lead.fit_score >= 170
                                ? 'text-emerald-400'
                                : lead.fit_score >= 120
                                ? 'text-yellow-400'
                                : 'text-neutral-500'
                            }`}
                          >
                            {lead.fit_score}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              lead.outreach_status === 'replied'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : lead.outreach_status === 'meeting'
                                ? 'bg-indigo-500/10 text-indigo-400'
                                : lead.outreach_status === 'sent'
                                ? 'bg-blue-500/10 text-blue-400'
                                : 'bg-neutral-800 text-neutral-500'
                            }`}
                          >
                            {lead.outreach_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Copy tab ──────────────────────────────────────────────────────── */}
        {activeTab === 'copy' && (
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <h2 className="text-base font-semibold text-white mb-1">Campaign Copy</h2>
              <p className="text-gray-500 text-xs">
                Email and LinkedIn variants generated by Skill 3.
              </p>
            </div>

            {variantsLoading ? (
              <div className="flex items-center justify-center h-48 text-gray-500 text-sm gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading variants…
              </div>
            ) : variants.length === 0 ? (
              <div className="border border-dashed border-neutral-700 rounded-xl p-12 text-center">
                <Mail className="h-8 w-8 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm mb-1">Copy not generated yet</p>
                <p className="text-gray-500 text-xs">
                  Run Skill 3 in the Pipeline tab to generate email and LinkedIn variants.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Group by channel */}
                {(['email', 'linkedin'] as const).map((channel) => {
                  const channelVariants = variants.filter((v) => v.channel === channel);
                  if (channelVariants.length === 0) return null;
                  return (
                    <div key={channel}>
                      <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                        {channel === 'email' ? '📧 Email Variants' : '💼 LinkedIn Variants'}
                      </h3>
                      <div className="space-y-3">
                        {channelVariants.map((v, idx) => (
                          <div
                            key={v.id}
                            className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden"
                          >
                            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-800/30">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-white">
                                  Variant {idx + 1}
                                </span>
                                {v.variant_name && (
                                  <span className="text-xs text-neutral-500">— {v.variant_name}</span>
                                )}
                              </div>
                              {v.framework_used && (
                                <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                                  {v.framework_used}
                                </span>
                              )}
                            </div>
                            {v.subject_line && (
                              <div className="px-4 py-2 border-b border-neutral-800/60">
                                <span className="text-xs text-neutral-500">Subject: </span>
                                <span className="text-xs text-white font-medium">{v.subject_line}</span>
                              </div>
                            )}
                            <div className="px-4 py-3">
                              <pre className="text-xs text-neutral-300 whitespace-pre-wrap font-sans leading-relaxed">
                                {v.body}
                              </pre>
                            </div>
                            <div className="px-4 pb-3 flex justify-end">
                              <button
                                onClick={() =>
                                  navigator.clipboard.writeText(
                                    v.subject_line ? `Subject: ${v.subject_line}\n\n${v.body}` : (v.body ?? ''),
                                  )
                                }
                                className="text-xs text-neutral-500 hover:text-neutral-300 flex items-center gap-1 transition-colors"
                              >
                                <Copy className="h-3 w-3" /> Copy
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Results tab ───────────────────────────────────────────────────── */}
        {activeTab === 'results' && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h2 className="text-base font-semibold text-white mb-1">Campaign Results</h2>
              <p className="text-gray-500 text-xs">
                Funnel metrics updated by Skill 6 after campaign analysis.
              </p>
            </div>

            {metricsLoading ? (
              <div className="flex items-center justify-center h-48 text-gray-500 text-sm gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading results…
              </div>
            ) : metrics ? (
              <div className="space-y-4">
                {/* Funnel KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Companies', value: metrics.total_companies, color: 'text-indigo-400' },
                    { label: 'Contacts', value: metrics.total_contacts, color: 'text-violet-400' },
                    { label: 'Messages Sent', value: metrics.total_messages, color: 'text-blue-400' },
                    { label: 'Replies', value: metrics.total_replies, color: 'text-emerald-400' },
                    { label: 'Meetings', value: metrics.total_meetings, color: 'text-yellow-400' },
                    {
                      label: 'Reply Rate',
                      value: metrics.reply_rate != null ? `${(metrics.reply_rate * 100).toFixed(1)}%` : '—',
                      color: 'text-emerald-400',
                    },
                  ].map(({ label, value, color }) => (
                    <div
                      key={label}
                      className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-center"
                    >
                      <div className={`text-2xl font-bold ${color}`}>{value ?? 0}</div>
                      <div className="text-xs text-neutral-500 mt-1">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Meeting rate */}
                {metrics.meeting_rate != null && (
                  <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between">
                    <span className="text-sm text-neutral-300">Meeting Conversion Rate</span>
                    <span className="text-lg font-bold text-yellow-400">
                      {(metrics.meeting_rate * 100).toFixed(1)}%
                    </span>
                  </div>
                )}

                <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                  <p className="text-xs text-green-400 font-medium">
                    ✅ Learnings also saved to{' '}
                    <code className="font-mono">
                      offers/{offerSlug}/campaigns/{campaignSlug}/results/learnings.md
                    </code>{' '}
                    and <code className="font-mono">context/learnings/what-works.md</code>
                  </p>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-neutral-700 rounded-xl p-12 text-center">
                <BarChart2 className="h-8 w-8 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm mb-1">No results yet</p>
                <p className="text-gray-500 text-xs">
                  After launching your campaign in Apollo, run Skill 6 to analyze results and
                  update learnings.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
