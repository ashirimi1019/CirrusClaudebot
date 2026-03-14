'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Download,
  FileText,
  FileSpreadsheet,
  Brain,
  AlertTriangle,
  Filter,
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
  segment_key?: string | null;
  buyer_persona_angle?: string | null;
  needs_review?: boolean | null;
  intelligence_confidence?: number | null;
}

interface IntelligenceRow {
  id: string;
  company_id: string | null;
  offer_type: string;
  service_line: string;
  segment_key: string;
  messaging_angle: string | null;
  rationale: string | null;
  confidence: number | null;
  needs_review: boolean | null;
  fallback_applied: boolean | null;
  companies: { id: string; name: string; domain: string; fit_score: number } | null;
}

interface ContactIntelligenceRow {
  id: string;
  segment_key: string | null;
  buyer_persona_angle: string | null;
  contact_rationale: string | null;
  intelligence_confidence: number | null;
  needs_review: boolean | null;
  contacts: { id: string; first_name: string; last_name: string; title: string; email: string } | null;
  companies: { id: string; name: string; domain: string } | null;
}

interface SegmentSummary {
  segment_key: string;
  company_count: number;
  needs_review_count: number;
}

interface MessageVariant {
  id: string;
  channel: 'email' | 'linkedin';
  variant_name: string;
  subject_line: string | null;
  body: string | null;
  framework_used: string | null;
  segment_key: string | null;
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

interface Artifact {
  id: string;
  skill_number: number;
  file_name: string;
  file_type: string;
  category: string;
  file_size_bytes: number | null;
  created_at: string;
}

// ─── Intelligence UI types ────────────────────────────────────────────────────

interface IntelligenceSummaryStats {
  totalCompanies: number;
  totalContacts: number;
  activeSegments: number;
  avgConfidence: number;
  needsReviewCount: number;
  fallbackCount: number;
  highConfidenceCount: number;
  lowConfidenceCount: number;
}

interface RichSegmentSummary extends SegmentSummary {
  contact_count: number;
  avg_confidence: number;
  fallback_count: number;
  variant_count: number;
  apollo_sequence_id: string | null;
  contacts_routed: number;
  dominant_titles: string[];
}

interface RoutingStat {
  segment_key: string;
  apollo_sequence_id: string | null;
  total_contacts: number;
  sent: number;
  pending: number;
  failed: number;
}

interface Skill5ParsedSummary {
  companiesClassified: number;
  contactsProcessed: number;
  activeSegments: number;
  variantsGenerated: number;
  sequencesCreated: number;
  contactsEnrolled: number;
  needsReviewCount: number;
  highConfidenceCount: number;
  lowConfidenceCount: number;
}

// ─── Skill name map ───────────────────────────────────────────────────────────

const SKILL_NAMES: Record<number, string> = {
  1: 'New Offer',
  2: 'Campaign Strategy',
  3: 'Campaign Copy',
  4: 'Find Leads',
  5: 'Launch Outreach',
  6: 'Campaign Review',
};

// ─── Segment helpers ──────────────────────────────────────────────────────────

const OFFER_LABELS: Record<string, string> = {
  individual_placement: 'Individual',
  pod_delivery: 'Pod',
};

const SERVICE_LABELS: Record<string, string> = {
  data_engineering: 'Data Eng',
  ml_ai: 'ML/AI',
  cloud_infrastructure: 'Cloud',
  software_development: 'Software',
  cyber_security: 'Cyber',
};

const SEGMENT_COLORS: Record<string, string> = {
  data_engineering: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  ml_ai: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  cloud_infrastructure: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  software_development: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  cyber_security: 'bg-red-500/10 text-red-400 border-red-500/20',
};

function SegmentBadge({ segmentKey }: { segmentKey: string | null | undefined }) {
  if (!segmentKey) return <span className="text-neutral-600 text-xs">—</span>;
  const [offer, service] = segmentKey.split(':');
  const offerLabel = OFFER_LABELS[offer] ?? offer;
  const serviceLabel = SERVICE_LABELS[service] ?? service;
  const colors = SEGMENT_COLORS[service] ?? 'bg-neutral-800 text-neutral-400 border-neutral-700';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${colors}`}>
      {offerLabel} · {serviceLabel}
    </span>
  );
}

function formatSegmentLabel(segmentKey: string): string {
  const [offer, service] = segmentKey.split(':');
  return `${OFFER_LABELS[offer] ?? offer} × ${SERVICE_LABELS[service] ?? service}`;
}

function ConfidenceBadge({ confidence }: { confidence: number | null | undefined }) {
  if (confidence == null) return <span className="text-neutral-600 text-xs">—</span>;
  const pct = Math.round(confidence * 100);
  const color = confidence >= 0.8 ? 'text-emerald-400' : confidence >= 0.65 ? 'text-yellow-400' : 'text-red-400';
  return <span className={`text-xs font-mono font-semibold ${color}`}>{pct}%</span>;
}

function EffectiveVerticalBadge({ vertical }: { vertical: { name: string; source: 'campaign' | 'offer' | 'none' } | null }) {
  if (!vertical || vertical.source === 'none') return null;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 whitespace-nowrap">
      {vertical.name}
      <span className="text-indigo-400/50">
        {vertical.source === 'campaign' ? '(override)' : '(offer)'}
      </span>
    </span>
  );
}

// ─── Accent color per segment (for left borders) ────────────────────────────

function getSegmentAccentColor(segmentKey: string): string {
  const sl = segmentKey.split(':')[1] || '';
  const colors: Record<string, string> = {
    data_engineering: 'border-l-cyan-500',
    ml_ai: 'border-l-violet-500',
    cloud_infrastructure: 'border-l-orange-500',
    software_development: 'border-l-emerald-500',
    cyber_security: 'border-l-red-500',
  };
  return colors[sl] || 'border-l-neutral-500';
}

// ─── Parse Skill 5 log output into structured summary ────────────────────────

function parseSkill5Summary(logLines: string[]): Skill5ParsedSummary | null {
  if (!logLines?.length) return null;
  const text = logLines.join('\n');
  const num = (pattern: RegExp) => {
    const m = text.match(pattern);
    return m ? parseInt(m[1], 10) : 0;
  };
  return {
    companiesClassified: num(/Company Classifications:\s*(\d+)/),
    contactsProcessed: num(/contacts? (?:created|processed):\s*(\d+)/i),
    activeSegments: num(/Active Segments:\s*(\d+)/),
    variantsGenerated: num(/Saved (\d+) message variants/),
    sequencesCreated: num(/Created (\d+) sequence/i) || num(/Active Segments:\s*(\d+)/),
    contactsEnrolled: num(/Contacts? enrolled:\s*(\d+)/i),
    needsReviewCount: num(/needs review.*?:\s*(\d+)/i),
    highConfidenceCount: num(/High confidence.*?:\s*(\d+)/i),
    lowConfidenceCount: num(/Low.*?needs review.*?:\s*(\d+)/i),
  };
}

// ─── VariantCard ──────────────────────────────────────────────────────────────

function VariantCard({ variant: v, index: idx }: { variant: MessageVariant; index: number }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-800/30">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white">Variant {idx + 1}</span>
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
        <div className="px-4 py-2.5 border-b border-neutral-800/60">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-0.5">Subject</div>
          <div className="text-sm text-white font-semibold leading-snug">{v.subject_line}</div>
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
  );
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
            setExitCode(1);
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
        setExitCode(1);
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

type Tab = 'pipeline' | 'leads' | 'copy' | 'intelligence' | 'results';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'pipeline', label: 'Pipeline', icon: <Play className="h-3.5 w-3.5" /> },
  { id: 'leads', label: 'Leads', icon: <Users className="h-3.5 w-3.5" /> },
  { id: 'copy', label: 'Copy', icon: <Mail className="h-3.5 w-3.5" /> },
  { id: 'intelligence', label: 'Intelligence', icon: <Brain className="h-3.5 w-3.5" /> },
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

// ─── Artifact downloads ──────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ArtifactDownloads({
  artifacts,
  loading,
  skillFilter,
}: {
  artifacts: Artifact[];
  loading: boolean;
  skillFilter?: number[];
}) {
  const filtered = skillFilter
    ? artifacts.filter((a) => skillFilter.includes(a.skill_number))
    : artifacts;

  if (loading) return null;
  if (filtered.length === 0) return null;

  return (
    <div className="mt-6 pt-4 border-t border-neutral-800/60">
      <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
        Generated Files
      </h4>
      <div className="space-y-1.5">
        {filtered.map((art) => {
          const Icon = art.file_type === 'csv' ? FileSpreadsheet : FileText;
          return (
            <div
              key={art.id}
              className="flex items-center justify-between gap-3 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon className="h-3.5 w-3.5 text-neutral-500 flex-shrink-0" />
                <span className="text-xs text-neutral-300 truncate">
                  {art.file_name}
                </span>
                <span className="text-xs text-neutral-600">
                  Skill {art.skill_number}: {SKILL_NAMES[art.skill_number] ?? 'Unknown'}
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

  // Artifacts
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [artifactsLoading, setArtifactsLoading] = useState(false);

  // Intelligence tab
  const [intelligenceRows, setIntelligenceRows] = useState<IntelligenceRow[]>([]);
  const [contactIntelligence, setContactIntelligence] = useState<ContactIntelligenceRow[]>([]);
  const [segmentSummaries, setSegmentSummaries] = useState<SegmentSummary[]>([]);
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);

  // Intelligence UI state
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);
  const [routingStats, setRoutingStats] = useState<RoutingStat[]>([]);

  // Segment filter for Leads tab
  const [segmentFilter, setSegmentFilter] = useState<string | null>(null);

  const { logs, isRunning, exitCode, runningSkill, runSkill, logEndRef } =
    useCampaignSkillRunner(offerSlug, campaignSlug);

  // ── Intelligence computed values ─────────────────────────────────────────────

  const intelligenceSummary = useMemo<IntelligenceSummaryStats | null>(() => {
    if (!intelligenceRows.length) return null;
    const confs = intelligenceRows.map(r => r.confidence ?? 0);
    return {
      totalCompanies: intelligenceRows.length,
      totalContacts: contactIntelligence.length,
      activeSegments: segmentSummaries.length,
      avgConfidence: confs.reduce((a, b) => a + b, 0) / confs.length,
      needsReviewCount: intelligenceRows.filter(r => r.needs_review).length,
      fallbackCount: intelligenceRows.filter(r => r.fallback_applied).length,
      highConfidenceCount: confs.filter(c => c >= 0.80).length,
      lowConfidenceCount: confs.filter(c => c < 0.65).length,
    };
  }, [intelligenceRows, contactIntelligence, segmentSummaries]);

  const richSegments = useMemo<RichSegmentSummary[]>(() => {
    return segmentSummaries.map(seg => {
      const segContacts = contactIntelligence.filter(c => c.segment_key === seg.segment_key);
      const segIntel = intelligenceRows.filter(r => r.segment_key === seg.segment_key);
      const segVariants = variants.filter(v => v.segment_key === seg.segment_key);
      const confs = segIntel.map(r => r.confidence ?? 0);
      const routing = routingStats.find(rs => rs.segment_key === seg.segment_key);
      const titleCounts: Record<string, number> = {};
      segContacts.forEach(c => {
        const t = c.contacts?.title || 'Unknown';
        titleCounts[t] = (titleCounts[t] || 0) + 1;
      });
      const dominantTitles = Object.entries(titleCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([t]) => t);
      return {
        ...seg,
        contact_count: segContacts.length,
        avg_confidence: confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : 0,
        fallback_count: segIntel.filter(r => r.fallback_applied).length,
        variant_count: segVariants.length,
        apollo_sequence_id: routing?.apollo_sequence_id ?? null,
        contacts_routed: routing?.total_contacts ?? 0,
        dominant_titles: dominantTitles,
      };
    });
  }, [segmentSummaries, contactIntelligence, intelligenceRows, variants, routingStats]);

  const latestSkill5Summary = useMemo<Skill5ParsedSummary | null>(() => {
    if (!skillRuns?.length) return null;
    const skill5Run = skillRuns.find(r => r.skill_number === 5);
    if (!skill5Run?.log_lines) return null;
    return parseSkill5Summary(skill5Run.log_lines);
  }, [skillRuns]);

  // ── Resolve campaign ID + name from slugs ──────────────────────────────────
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState<string | null>(null);
  const [effectiveVertical, setEffectiveVertical] = useState<{ name: string; source: 'campaign' | 'offer' | 'none' } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('offers')
      .select('id, default_vertical_id, verticals(id, name, slug)')
      .eq('slug', offerSlug)
      .single()
      .then(({ data: offer }: { data: any | null }) => {
        if (!offer) return;
        supabase
          .from('campaigns')
          .select('id, name, vertical_id, verticals(id, name, slug)')
          .eq('offer_id', offer.id)
          .eq('slug', campaignSlug)
          .single()
          .then(({ data: campaign }: { data: any | null }) => {
            if (campaign) {
              setCampaignId(campaign.id);
              setCampaignName(campaign.name);

              const campaignVerticalName = campaign?.verticals?.name ?? null;
              const offerVerticalName = offer?.verticals?.name ?? null;
              const campaignVerticalId = campaign?.vertical_id ?? null;

              if (campaignVerticalId && campaignVerticalName) {
                setEffectiveVertical({ name: campaignVerticalName, source: 'campaign' });
              } else if (offerVerticalName) {
                setEffectiveVertical({ name: offerVerticalName, source: 'offer' });
              } else {
                setEffectiveVertical({ name: '', source: 'none' });
              }
            }
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
        segment_key,
        buyer_persona_angle,
        needs_review,
        intelligence_confidence,
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
          segment_key: string | null;
          buyer_persona_angle: string | null;
          needs_review: boolean | null;
          intelligence_confidence: number | null;
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
          segment_key: row.segment_key,
          buyer_persona_angle: row.buyer_persona_angle,
          needs_review: row.needs_review,
          intelligence_confidence: row.intelligence_confidence,
        }));
        setLeads(mapped);
        setLeadsLoading(false);
      });
  }, [activeTab, campaignId]);

  // ── Fetch message variants ──────────────────────────────────────────────────
  useEffect(() => {
    if (!campaignId) return;
    setVariantsLoading(true);
    const supabase = createClient();
    supabase
      .from('message_variants')
      .select('id, channel, variant_name, subject_line, body, framework_used, segment_key, created_at')
      .eq('campaign_id', campaignId)
      .order('channel')
      .order('created_at')
      .then(({ data }: { data: MessageVariant[] | null }) => {
        setVariants(data ?? []);
        setVariantsLoading(false);
      });
  }, [campaignId]);

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

  // ── Fetch artifacts ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!campaignId) return;
    setArtifactsLoading(true);
    const supabase = createClient();
    supabase
      .from('artifacts')
      .select('id, skill_number, file_name, file_type, category, file_size_bytes, created_at')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }: { data: Artifact[] | null }) => {
        setArtifacts(data ?? []);
        setArtifactsLoading(false);
      });
  }, [campaignId]);

  // ── Fetch intelligence data ────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'intelligence' || !campaignId) return;
    setIntelligenceLoading(true);

    const supabase = createClient();

    // Fetch company-level intelligence
    supabase
      .from('outreach_intelligence')
      .select(`
        id, company_id, offer_type, service_line, segment_key,
        messaging_angle, rationale, confidence, needs_review, fallback_applied,
        companies ( id, name, domain, fit_score )
      `)
      .eq('campaign_id', campaignId)
      .order('confidence', { ascending: true })
      .then(({ data }: { data: IntelligenceRow[] | null }) => {
        setIntelligenceRows(data ?? []);

        // Build segment summaries
        const segMap = new Map<string, { count: number; needsReview: number }>();
        for (const row of (data ?? [])) {
          const entry = segMap.get(row.segment_key) || { count: 0, needsReview: 0 };
          entry.count++;
          if (row.needs_review) entry.needsReview++;
          segMap.set(row.segment_key, entry);
        }
        setSegmentSummaries(
          Array.from(segMap.entries()).map(([key, stats]) => ({
            segment_key: key,
            company_count: stats.count,
            needs_review_count: stats.needsReview,
          })),
        );
      });

    // Fetch contact-level intelligence
    supabase
      .from('campaign_contacts')
      .select(`
        id, segment_key, buyer_persona_angle, contact_rationale,
        intelligence_confidence, needs_review,
        contacts ( id, first_name, last_name, title, email ),
        companies ( id, name, domain )
      `)
      .eq('campaign_id', campaignId)
      .not('segment_key', 'is', null)
      .order('intelligence_confidence', { ascending: true })
      .then(({ data }: { data: ContactIntelligenceRow[] | null }) => {
        setContactIntelligence(data ?? []);
        setIntelligenceLoading(false);
      });

    // Fetch routing stats from messages table
    supabase
      .from('messages')
      .select('segment_key, apollo_sequence_id, send_status')
      .eq('campaign_id', campaignId)
      .then(({ data: msgData }: { data: { segment_key: string; apollo_sequence_id: string; send_status: string }[] | null }) => {
        if (msgData?.length) {
          const grouped: Record<string, RoutingStat> = {};
          msgData.forEach((m) => {
            const key = m.segment_key || 'unassigned';
            if (!grouped[key]) grouped[key] = { segment_key: key, apollo_sequence_id: m.apollo_sequence_id, total_contacts: 0, sent: 0, pending: 0, failed: 0 };
            grouped[key].total_contacts++;
            if (m.send_status === 'sent') grouped[key].sent++;
            else if (m.send_status === 'failed') grouped[key].failed++;
            else grouped[key].pending++;
          });
          setRoutingStats(Object.values(grouped));
        }
      });
  }, [activeTab, campaignId]);

  // Refresh artifacts when a skill finishes
  useEffect(() => {
    if (!isRunning && exitCode !== null && campaignId) {
      const supabase = createClient();
      supabase
        .from('artifacts')
        .select('id, skill_number, file_name, file_type, category, file_size_bytes, created_at')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
        .limit(100)
        .then(({ data }: { data: Artifact[] | null }) => {
          setArtifacts(data ?? []);
        });
    }
  }, [isRunning, exitCode, campaignId]);

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
            <h1 className="text-sm font-semibold text-white truncate">{campaignName ?? campaignSlug}</h1>
          </div>
        </div>
        <EffectiveVerticalBadge vertical={effectiveVertical} />
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
              recentRuns={skillRuns}
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
                  skillName={runningSkill ? SKILL_NAMES[runningSkill] : undefined}
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

            {/* All generated files */}
            <ArtifactDownloads artifacts={artifacts} loading={artifactsLoading} />
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
                  Export {leads.length.toLocaleString()} (CSV)
                </button>
              )}
            </div>

            {/* Segment filter */}
            {leads.length > 0 && leads.some((l) => l.segment_key) && (
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-3.5 w-3.5 text-neutral-500" />
                <select
                  value={segmentFilter ?? ''}
                  onChange={(e) => setSegmentFilter(e.target.value || null)}
                  className="bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Segments</option>
                  {[...new Set(leads.map((l) => l.segment_key).filter(Boolean) as string[])].map(
                    (sk) => (
                      <option key={sk} value={sk}>
                        {formatSegmentLabel(sk)}
                      </option>
                    ),
                  )}
                </select>
                {segmentFilter && (
                  <button
                    onClick={() => setSegmentFilter(null)}
                    className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    Clear
                  </button>
                )}
                <span className="text-xs text-neutral-600 ml-auto">
                  {segmentFilter
                    ? `${leads.filter((l) => l.segment_key === segmentFilter).length} of ${leads.length}`
                    : `${leads.length} total`}
                </span>
              </div>
            )}

            {leadsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-neutral-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading leads…</span>
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
                      {['Name', 'Title', 'Company', 'Segment', 'Email', 'ICP', 'Status'].map((h) => (
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
                    {leads
                      .filter((l) => !segmentFilter || l.segment_key === segmentFilter)
                      .map((lead) => (
                      <tr key={lead.id} className="hover:bg-neutral-800/30 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-white font-medium text-sm">
                              {lead.first_name} {lead.last_name}
                            </span>
                            {lead.needs_review && (
                              <span title="Needs review">
                                <AlertTriangle className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                              </span>
                            )}
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
                        <td className="px-4 py-3 max-w-[180px]">
                          <div className="text-gray-400 text-xs truncate">{lead.title || '—'}</div>
                          {lead.buyer_persona_angle && (
                            <div className="text-indigo-400 text-[11px] font-medium mt-0.5 truncate" title={lead.buyer_persona_angle}>
                              {lead.buyer_persona_angle}
                            </div>
                          )}
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
                          <SegmentBadge segmentKey={lead.segment_key} />
                          {lead.intelligence_confidence != null && (
                            <div className="mt-1">
                              <ConfidenceBadge confidence={lead.intelligence_confidence} />
                            </div>
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

            {/* Lead-related artifacts (Skill 4 CSV) */}
            <ArtifactDownloads artifacts={artifacts} loading={artifactsLoading} skillFilter={[4]} />
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
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-neutral-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading copy variants…</span>
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
                {(() => {
                  // Check if any variants have segment_key
                  const hasSegments = variants.some((v) => v.segment_key);
                  if (!hasSegments) {
                    // Legacy: group by channel only
                    return (['email', 'linkedin'] as const).map((channel) => {
                      const channelVariants = variants.filter((v) => v.channel === channel);
                      if (channelVariants.length === 0) return null;
                      return (
                        <div key={channel}>
                          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                            {channel === 'email' ? '📧 Email Variants' : '💼 LinkedIn Variants'}
                          </h3>
                          <div className="space-y-3">
                            {channelVariants.map((v, idx) => (
                              <VariantCard key={v.id} variant={v} index={idx} />
                            ))}
                          </div>
                        </div>
                      );
                    });
                  }

                  // Segment-grouped: group by segment_key then channel within each
                  const segmentKeys = [...new Set(variants.map((v) => v.segment_key).filter(Boolean) as string[])];
                  return segmentKeys.map((sk) => {
                    const segVariants = variants.filter((v) => v.segment_key === sk);
                    return (
                      <div key={sk} className="border border-neutral-800 rounded-xl overflow-hidden">
                        {/* Segment header */}
                        <div className={`px-4 py-3 bg-neutral-800/40 border-b border-neutral-800 border-l-2 ${getSegmentAccentColor(sk)} flex items-center justify-between`}>
                          <div className="flex items-center gap-3">
                            <SegmentBadge segmentKey={sk} />
                            <span className="text-xs text-neutral-500">
                              {segVariants.length} variant{segVariants.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {(() => {
                            const rich = richSegments.find(rs => rs.segment_key === sk);
                            return rich ? (
                              <div className="flex items-center gap-3 text-[10px] text-neutral-500">
                                <span>{rich.company_count} companies</span>
                                <span className="text-neutral-700">·</span>
                                <span>{rich.contact_count} contacts</span>
                                {rich.avg_confidence > 0 && (
                                  <>
                                    <span className="text-neutral-700">·</span>
                                    <span>avg conf: {(rich.avg_confidence * 100).toFixed(0)}%</span>
                                  </>
                                )}
                              </div>
                            ) : null;
                          })()}
                        </div>
                        <div className="p-4 space-y-4">
                          {(['email', 'linkedin'] as const).map((channel) => {
                            const channelVariants = segVariants.filter((v) => v.channel === channel);
                            if (channelVariants.length === 0) return null;
                            return (
                              <div key={channel}>
                                <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                                  {channel === 'email' ? '📧 Email' : '💼 LinkedIn'}
                                </h4>
                                <div className="space-y-3">
                                  {channelVariants.map((v, idx) => (
                                    <VariantCard key={v.id} variant={v} index={idx} />
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* Copy-related artifacts (Skill 3 files) */}
            <ArtifactDownloads artifacts={artifacts} loading={artifactsLoading} skillFilter={[3]} />
          </div>
        )}

        {/* ── Intelligence tab ──────────────────────────────────────────────── */}
        {activeTab === 'intelligence' && (
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <h2 className="text-base font-semibold text-white mb-1">Outreach Intelligence</h2>
              <p className="text-gray-500 text-xs">
                AI-generated company and contact classifications from Skill 5.
              </p>
            </div>

            {intelligenceLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-neutral-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading intelligence data…</span>
              </div>
            ) : intelligenceRows.length === 0 ? (
              <div className="border border-dashed border-neutral-700 rounded-xl p-12 text-center">
                <Brain className="h-8 w-8 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 text-sm mb-1">No intelligence data yet</p>
                <p className="text-gray-500 text-xs max-w-md mx-auto">
                  Run Skill 5 with intelligence enabled to classify companies and contacts.
                  Intelligence classifies each company into offer × service line segments and adapts
                  buyer messaging per contact.
                </p>
              </div>
            ) : (
              <div className="space-y-8">

                {/* ── 9a: Intelligence Summary Bar ─────────────────────────── */}
                {intelligenceSummary && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                      { label: 'Companies', value: intelligenceSummary.totalCompanies, color: 'text-indigo-400' },
                      { label: 'Contacts', value: intelligenceSummary.totalContacts, color: 'text-violet-400' },
                      { label: 'Segments', value: intelligenceSummary.activeSegments, color: 'text-blue-400' },
                      { label: 'Avg Confidence', value: `${(intelligenceSummary.avgConfidence * 100).toFixed(0)}%`, color: intelligenceSummary.avgConfidence >= 0.80 ? 'text-emerald-400' : intelligenceSummary.avgConfidence >= 0.65 ? 'text-yellow-400' : 'text-red-400' },
                      { label: 'Needs Review', value: intelligenceSummary.needsReviewCount, color: intelligenceSummary.needsReviewCount > 0 ? 'text-yellow-400' : 'text-neutral-500' },
                      { label: 'Fallback', value: intelligenceSummary.fallbackCount, color: intelligenceSummary.fallbackCount > 0 ? 'text-orange-400' : 'text-neutral-500' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-center">
                        <div className={`text-lg font-bold ${color}`}>{value}</div>
                        <div className="text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── 9b: Needs Review Banner ─────────────────────────────── */}
                {intelligenceSummary && intelligenceSummary.needsReviewCount > 0 && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                    <span className="text-xs text-yellow-300">
                      {intelligenceSummary.needsReviewCount} classification{intelligenceSummary.needsReviewCount !== 1 ? 's' : ''} flagged for review — low confidence or fallback applied.
                      {intelligenceSummary.lowConfidenceCount > 0 && (
                        <span className="text-yellow-400/60"> ({intelligenceSummary.lowConfidenceCount} below 65% confidence)</span>
                      )}
                    </span>
                  </div>
                )}

                {/* ── 9c: Skill 5 Run Outcome Panel ───────────────────────── */}
                {latestSkill5Summary && (
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-800/30">
                      <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Latest Skill 5 Run</h3>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-px bg-neutral-800">
                      {[
                        { label: 'Classified', value: latestSkill5Summary.companiesClassified },
                        { label: 'Contacts', value: latestSkill5Summary.contactsProcessed },
                        { label: 'Segments', value: latestSkill5Summary.activeSegments },
                        { label: 'Variants', value: latestSkill5Summary.variantsGenerated },
                        { label: 'Sequences', value: latestSkill5Summary.sequencesCreated },
                        { label: 'Enrolled', value: latestSkill5Summary.contactsEnrolled },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-neutral-900 px-3 py-3 text-center">
                          <div className="text-sm font-bold text-white">{value}</div>
                          <div className="text-[10px] text-neutral-500 mt-0.5">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── 9d: Rich Segment Cards ───────────────────────────────── */}
                {richSegments.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Segments</h3>
                      <div className="flex-1 h-px bg-neutral-800" />
                      <span className="text-xs text-neutral-500">{richSegments.length} active</span>
                    </div>
                    <div className="space-y-3">
                      {richSegments.map((seg) => (
                        <div
                          key={seg.segment_key}
                          className={`bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden border-l-2 ${getSegmentAccentColor(seg.segment_key)}`}
                        >
                          {/* Header */}
                          <div className="px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <SegmentBadge segmentKey={seg.segment_key} />
                              <span className="text-[10px] text-neutral-500">
                                {OFFER_LABELS[seg.segment_key.split(':')[0]] ?? seg.segment_key.split(':')[0]} ×{' '}
                                {SERVICE_LABELS[seg.segment_key.split(':')[1]] ?? seg.segment_key.split(':')[1]}
                              </span>
                            </div>
                            {seg.needs_review_count > 0 && (
                              <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> {seg.needs_review_count} review
                              </span>
                            )}
                          </div>

                          {/* Stats row */}
                          <div className="px-4 pb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span className="text-xs text-neutral-400">
                              <span className="font-semibold text-white">{seg.company_count}</span> companies
                            </span>
                            <span className="text-xs text-neutral-400">
                              <span className="font-semibold text-white">{seg.contact_count}</span> contacts
                            </span>
                            <span className="text-xs text-neutral-400">
                              <span className="font-semibold text-white">{seg.variant_count}</span> variants
                            </span>
                            {seg.avg_confidence > 0 && (
                              <span className="text-xs text-neutral-400">
                                avg conf:{' '}
                                <span className={`font-semibold ${seg.avg_confidence >= 0.80 ? 'text-emerald-400' : seg.avg_confidence >= 0.65 ? 'text-yellow-400' : 'text-red-400'}`}>
                                  {(seg.avg_confidence * 100).toFixed(0)}%
                                </span>
                              </span>
                            )}
                            {seg.fallback_count > 0 && (
                              <span className="text-xs text-orange-400/70">
                                {seg.fallback_count} fallback
                              </span>
                            )}
                          </div>

                          {/* Apollo routing row */}
                          {seg.apollo_sequence_id && (
                            <div className="px-4 pb-2 flex items-center gap-3 text-[10px] text-neutral-500">
                              <span>Sequence: <span className="text-neutral-400 font-mono">{seg.apollo_sequence_id.slice(0, 12)}…</span></span>
                              <span className="text-neutral-700">·</span>
                              <span>{seg.contacts_routed} routed</span>
                              {(() => {
                                const routing = routingStats.find(rs => rs.segment_key === seg.segment_key);
                                return routing ? (
                                  <>
                                    {routing.sent > 0 && <span className="text-emerald-500">{routing.sent} sent</span>}
                                    {routing.pending > 0 && <span className="text-neutral-400">{routing.pending} pending</span>}
                                    {routing.failed > 0 && <span className="text-red-400">{routing.failed} failed</span>}
                                  </>
                                ) : null;
                              })()}
                            </div>
                          )}

                          {/* Dominant titles */}
                          {seg.dominant_titles.length > 0 && (
                            <div className="px-4 pb-3 flex items-center gap-1.5">
                              <span className="text-[10px] text-neutral-600">Top titles:</span>
                              {seg.dominant_titles.map((t) => (
                                <span key={t} className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── 9f: Company Classifications Table ────────────────────── */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Company Classifications</h3>
                    <div className="flex-1 h-px bg-neutral-800" />
                    <span className="text-xs text-neutral-500">{intelligenceRows.length} companies</span>
                  </div>
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-neutral-800 bg-neutral-800/30">
                            {['Company', 'Segment', 'Messaging Angle', 'Confidence', 'Status'].map(
                              (h) => (
                                <th
                                  key={h}
                                  className="px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider"
                                >
                                  {h}
                                </th>
                              ),
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                          {intelligenceRows.map((row) => (
                            <tr key={row.id} className={`hover:bg-neutral-800/30 transition-colors border-l-2 ${getSegmentAccentColor(row.segment_key)}`}>
                              <td className="px-4 py-3">
                                <div className="text-xs font-medium text-white">
                                  {row.companies?.name ?? '—'}
                                </div>
                                <div className="text-xs text-neutral-500">
                                  {row.companies?.domain ?? '—'}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <SegmentBadge segmentKey={row.segment_key} />
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-xs text-neutral-300 max-w-xs truncate" title={row.messaging_angle ?? undefined}>
                                  {row.messaging_angle ?? '—'}
                                </div>
                                {row.rationale && (
                                  <div className="text-xs text-neutral-600 max-w-xs truncate mt-0.5" title={row.rationale}>
                                    {row.rationale}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <ConfidenceBadge confidence={row.confidence} />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {row.needs_review && (
                                    <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" /> Review
                                    </span>
                                  )}
                                  {row.fallback_applied && (
                                    <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full">
                                      Fallback
                                    </span>
                                  )}
                                  {!row.needs_review && !row.fallback_applied && (
                                    <span className="text-xs text-emerald-400">
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* ── 9g: Contact Buyer Adaptations (expandable rows) ─────── */}
                {contactIntelligence.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Contact Buyer Adaptations</h3>
                      <div className="flex-1 h-px bg-neutral-800" />
                      <span className="text-xs text-neutral-500">{contactIntelligence.length} contacts</span>
                    </div>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-neutral-800 bg-neutral-800/30">
                              {['', 'Contact', 'Title', 'Segment', 'Buyer Angle', 'Confidence'].map(
                                (h) => (
                                  <th
                                    key={h || 'expand'}
                                    className={`px-4 py-3 text-xs font-medium text-neutral-500 uppercase tracking-wider ${h === '' ? 'w-8' : ''}`}
                                  >
                                    {h}
                                  </th>
                                ),
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-800">
                            {contactIntelligence.map((ci) => {
                              const isExpanded = expandedContactId === ci.id;
                              return (
                                <React.Fragment key={ci.id}>
                                  <tr
                                    className="hover:bg-neutral-800/30 transition-colors cursor-pointer"
                                    onClick={() => setExpandedContactId(isExpanded ? null : ci.id)}
                                  >
                                    <td className="px-4 py-3 text-neutral-500">
                                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs font-medium text-white">
                                          {ci.contacts?.first_name} {ci.contacts?.last_name}
                                        </span>
                                        {ci.needs_review && (
                                          <AlertTriangle className="h-3 w-3 text-yellow-400" />
                                        )}
                                      </div>
                                      <div className="text-[10px] text-neutral-500">{ci.companies?.name ?? ''}</div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-neutral-300">
                                      {ci.contacts?.title ?? '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                      <SegmentBadge segmentKey={ci.segment_key} />
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="text-xs text-indigo-400 font-medium max-w-xs truncate" title={ci.buyer_persona_angle ?? undefined}>
                                        {ci.buyer_persona_angle ?? '—'}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <ConfidenceBadge confidence={ci.intelligence_confidence} />
                                    </td>
                                  </tr>
                                  {isExpanded && (
                                    <tr className="bg-neutral-800/20">
                                      <td colSpan={6} className="px-8 py-4">
                                        <div className="space-y-3">
                                          {ci.buyer_persona_angle && (
                                            <div>
                                              <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Buyer Persona Angle</div>
                                              <div className="text-xs text-indigo-400 font-medium leading-relaxed">{ci.buyer_persona_angle}</div>
                                            </div>
                                          )}
                                          {ci.contact_rationale && (
                                            <div>
                                              <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">Contact Rationale</div>
                                              <div className="text-xs text-neutral-300 leading-relaxed">{ci.contact_rationale}</div>
                                            </div>
                                          )}
                                          {ci.needs_review && (
                                            <div className="flex items-center gap-2 mt-2">
                                              <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />
                                              <span className="text-xs text-yellow-300">Flagged for review — verify classification before outreach</span>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── 9h: Intelligence but no contacts state ───────────────── */}
                {contactIntelligence.length === 0 && intelligenceRows.length > 0 && (
                  <div className="border border-dashed border-neutral-700 rounded-xl p-8 text-center">
                    <Users className="h-6 w-6 text-neutral-600 mx-auto mb-2" />
                    <p className="text-neutral-400 text-sm mb-1">Company classifications loaded</p>
                    <p className="text-neutral-500 text-xs">
                      Contact-level buyer adaptations will appear after contacts are processed through intelligence.
                    </p>
                  </div>
                )}
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
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-neutral-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading results…</span>
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

            {/* Outreach & review artifacts (Skills 5 & 6) */}
            <ArtifactDownloads artifacts={artifacts} loading={artifactsLoading} skillFilter={[5, 6]} />
          </div>
        )}
      </div>
    </div>
  );
}
