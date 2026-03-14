import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { withRetry } from '../services/retry.ts';
import type {
  CompanyClassification,
  CompanyClassificationInput,
  ContactMessagingAdaptation,
  SegmentVariant,
  SegmentKey,
  OfferType,
  ServiceLine,
} from '../../types/intelligence.ts';
import { LOW_CONFIDENCE_THRESHOLD } from '../../types/intelligence.ts';

// Dynamic memory context is optional - only imported if available
let buildDynamicContextFn: ((campaignId?: string) => Promise<string>) | null = null;

// Try to load buildDynamicContext, but don't fail if unavailable
try {
  const memoryModule = await import('../../brain/memory.js');
  buildDynamicContextFn = memoryModule.buildDynamicContext;
} catch (err) {
  // Memory module not available yet - that's OK for initial runs
}

export interface DraftGenerationInput {
  company_name?: string;
  companyName?: string;
  buyer_first_name?: string;
  buyerFirstName?: string;
  buyer_title?: string;
  buyerTitle?: string;
  signal?: string;
  evidenceTitle?: string;
  jobUrl?: string;
  additionalContext?: string;
}

export interface GeneratedDraft {
  subject: string;
  body: string;
}

export async function generateDraft(input: DraftGenerationInput): Promise<GeneratedDraft> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');

  const prompt = await buildPrompt(input);

  const response = await withRetry(
    () => axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: input.additionalContext?.includes('VERTICAL:') || input.additionalContext?.includes('## Overview')
              ? 'You are an expert B2B outreach copywriter specializing in technology services. You write compelling, signal-driven cold emails that convert.'
              : 'You are an expert B2B outreach copywriter for staffing/talent acquisition. You write emails that convert. Follow the principles provided and generate compelling, personalized emails that reference specific signals. Your emails are professional, direct, and honest—never generic filler.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    ),
    { label: 'openai_generate_draft', maxAttempts: 3 }
  );

  // Validate response structure
  const choices = response.data?.choices;
  if (!choices || choices.length === 0 || !choices[0]?.message?.content) {
    throw new Error('OpenAI returned empty response — no choices or content in API response');
  }

  const content = choices[0].message.content;
  const lines = content.split('\n').filter((l: string) => l.trim() !== '');

  if (lines.length === 0) {
    throw new Error('OpenAI returned empty content — generated text was blank');
  }

  const subjectLine = lines[0];
  const bodyLines = lines.slice(1);

  const subject = subjectLine.replace(/^Subject:\s*/i, '').trim();
  const body = bodyLines.join('\n').trim();

  if (!subject) {
    console.warn('  ⚠️ OpenAI generated empty subject line — using fallback');
  }
  if (!body || body.length < 20) {
    console.warn(`  ⚠️ OpenAI generated very short body (${body.length} chars)`);
  }

  return { subject: subject || 'Follow-up from CirrusLabs', body };
}

async function buildPrompt(input: DraftGenerationInput): Promise<string> {
  // Handle both snake_case and camelCase input (for compatibility)
  const companyName = input.company_name || input.companyName || '[Company Name]';
  const buyerFirstName = input.buyer_first_name || input.buyerFirstName || '[First Name]';
  const buyerTitle = input.buyer_title || input.buyerTitle || '[Title]';
  const signal = input.signal || input.evidenceTitle || 'hiring signal';
  const jobUrl = input.jobUrl;

  // Load email principles context
  const emailPrinciplesPath = path.join(process.cwd(), 'context', 'copywriting', 'email-principles.md');
  let emailPrinciples = '';

  try {
    emailPrinciples = fs.readFileSync(emailPrinciplesPath, 'utf-8');
  } catch (err) {
    console.warn('Warning: Could not load email-principles.md');
  }

  // Get dynamic context from memory (top subject lines, objections, learnings)
  // This closes the flywheel: campaign results → database → LLM prompts
  let dynamicContext = '';
  if (buildDynamicContextFn) {
    try {
      dynamicContext = await buildDynamicContextFn();
      if (dynamicContext.trim().length > 0) {
        console.log('✅ Injected dynamic context from previous campaigns');
      }
    } catch (err) {
      // If memory layer fails, continue with just email principles
      // console.warn('Note: Dynamic context unavailable, using base principles only');
    }
  }

  return `You are an expert B2B outreach copywriter for a staffing company. Follow these exact principles when writing emails:

${emailPrinciples}

${dynamicContext ? `---\n\n${dynamicContext}\n\n---` : ''}

${input.additionalContext ? `--- VERTICAL CONTEXT ---\n${input.additionalContext}\n---` : ''}

Now generate an outreach email for:
- Company: ${companyName}
- Recipient: ${buyerFirstName} (${buyerTitle})
- Signal/Evidence: ${signal}
${jobUrl ? `- Job URL: ${jobUrl}` : ''}

Output format:
Subject: [compelling subject line]
[Email body - 100-150 words, reference the signal directly, no generic filler]`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTELLIGENCE LAYER — Company Classification, Contact Adaptation, Segment Copy
// ═══════════════════════════════════════════════════════════════════════════════

function getApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
  return apiKey;
}

function loadContextFile(relativePath: string): string {
  try {
    return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf-8');
  } catch {
    console.warn(`  Warning: Could not load ${relativePath}`);
    return '';
  }
}

async function callOpenAIJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  options: { temperature?: number; maxTokens?: number; label: string }
): Promise<T> {
  const apiKey = getApiKey();

  const response = await withRetry(
    () => axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 2000,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    ),
    { label: options.label, maxAttempts: 3 }
  );

  const content = response.data?.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${options.label}: OpenAI returned empty response`);

  return JSON.parse(content) as T;
}

// ─── 1. Company Classification (Batch) ──────────────────────────────────────

/**
 * Classify a batch of companies into offer_type + service_line segments.
 * Batch 5-10 companies per call for efficiency.
 */
export async function classifyCompanyBatch(
  companies: CompanyClassificationInput[],
  contextFiles?: { useCaseGuide?: string; icpFramework?: string }
): Promise<CompanyClassification[]> {
  const useCaseGuide = contextFiles?.useCaseGuide || loadContextFile('context/principles/use-case-driven.md');
  const icpFramework = contextFiles?.icpFramework || loadContextFile('context/frameworks/icp-framework.md');

  const systemPrompt = `You are an expert B2B sales strategist for CirrusLabs, a staffing company that provides engineering talent.

You classify companies into segments based on their hiring signals to determine the best outreach approach.

OFFER TYPES:
- "individual_placement": Company needs 1-2 individual engineers. Best for smaller roles, specific skill gaps.
- "pod_delivery": Company needs a team (3+ engineers) or a project-based delivery pod. Best for large hiring signals, platform builds, data team buildouts.

SERVICE LINES (pick the primary one):
- "data_engineering": Data pipelines, ETL, data platforms, analytics infrastructure
- "ml_ai": Machine learning, AI, NLP, computer vision, MLOps
- "cloud_infrastructure": Cloud architecture, DevOps, SRE, platform engineering, Kubernetes
- "software_development": Backend, frontend, full-stack, mobile development
- "cyber_security": Security engineering, AppSec, SOC, compliance engineering

CONFIDENCE SCORING:
- 0.90-1.00: Very clear signal, obvious classification
- 0.75-0.89: Strong signal, high confidence
- 0.65-0.74: Moderate signal, reasonable classification
- Below 0.65: Weak signal, uncertain — set needs_review: true

${useCaseGuide ? `\n--- USE CASE GUIDE ---\n${useCaseGuide}\n---` : ''}
${icpFramework ? `\n--- ICP FRAMEWORK ---\n${icpFramework}\n---` : ''}`;

  const companySummaries = companies.map((c, i) =>
    `${i + 1}. Company: ${c.company_name} (${c.domain})
   Hiring signal: ${c.hiring_signal}
   ${c.fit_score ? `Fit score: ${c.fit_score}` : ''}
   ${c.employee_count ? `Employees: ${c.employee_count}` : ''}
   ${c.industry ? `Industry: ${c.industry}` : ''}
   ${c.funding_stage ? `Funding: ${c.funding_stage}` : ''}
   ${c.buyer_titles?.length ? `Buyer titles: ${c.buyer_titles.join(', ')}` : ''}`
  ).join('\n\n');

  const userPrompt = `Classify the following ${companies.length} companies into segments.

${companySummaries}

Return a JSON object with key "classifications" containing an array. Each item must have:
- company_name (string)
- company_domain (string)
- offer_type ("individual_placement" or "pod_delivery")
- service_line ("data_engineering", "ml_ai", "cloud_infrastructure", "software_development", or "cyber_security")
- segment_key (format: "{offer_type}:{service_line}")
- messaging_angle (1-2 sentence tailored angle for outreach)
- rationale (1-2 sentence explanation of why this classification)
- confidence (number 0.00-1.00)
- needs_review (boolean — true if confidence < 0.65)`;

  const result = await callOpenAIJSON<{ classifications: CompanyClassification[] }>(
    systemPrompt,
    userPrompt,
    { temperature: 0.3, maxTokens: 3000, label: 'openai_classify_companies' }
  );

  // Validate and normalize
  return (result.classifications || []).map((c) => ({
    ...c,
    segment_key: `${c.offer_type}:${c.service_line}` as SegmentKey,
    needs_review: c.confidence < LOW_CONFIDENCE_THRESHOLD ? true : (c.needs_review ?? false),
  }));
}

// ─── 2. Contact-Level Messaging Adaptation ──────────────────────────────────

/**
 * Generate title-aware buyer messaging adaptation for contacts.
 * Different angles for CTO vs VP Engineering vs Head of Data vs Founder, etc.
 */
export async function generateContactMessagingAdaptation(
  contacts: Array<{
    company_domain: string;
    company_name: string;
    contact_email?: string;
    contact_name?: string;
    title: string;
    offer_type: OfferType;
    service_line: ServiceLine;
    messaging_angle: string;
  }>,
  contextFiles?: { useCaseGuide?: string; icpFramework?: string }
): Promise<ContactMessagingAdaptation[]> {
  const icpFramework = contextFiles?.icpFramework || loadContextFile('context/frameworks/icp-framework.md');

  const systemPrompt = `You are an expert B2B sales messaging strategist for CirrusLabs, a staffing company.

Your job is to adapt the messaging angle for each contact based on their title/role.

Different buyers care about different things:
- Founder/CEO: Speed, cost efficiency, scaling without slowing product
- CTO: Technical quality, team fit, reducing hiring risk
- VP Engineering: Capacity planning, roadmap delivery, team velocity
- VP Data / Head of Data: Data pipeline reliability, analytics capacity, platform maturity
- Head of AI / ML Lead: ML production readiness, specialized talent scarcity
- CIO: Modernization outcomes, vendor management, compliance
- Director of Engineering: Sprint velocity, team composition, direct impact
- Engineering Manager: Backfill speed, skill match, onboarding ease

${icpFramework ? `\n--- BUYER PROFILES ---\n${icpFramework}\n---` : ''}`;

  const contactSummaries = contacts.map((c, i) =>
    `${i + 1}. ${c.contact_name || 'Unknown'} — ${c.title} at ${c.company_name} (${c.company_domain})
   Offer type: ${c.offer_type}, Service line: ${c.service_line}
   Company messaging angle: ${c.messaging_angle}`
  ).join('\n\n');

  const userPrompt = `Adapt the messaging for each contact's specific title/role.

${contactSummaries}

Return a JSON object with key "adaptations" containing an array. Each item must have:
- company_domain (string)
- contact_email (string or null)
- contact_name (string or null)
- title (string)
- buyer_persona_angle (1-2 sentence angle tailored to this title's priorities)
- contact_rationale (brief explanation of why this angle for this title)
- intelligence_confidence (number 0.00-1.00)
- needs_review (boolean — true if confidence < 0.65)`;

  const result = await callOpenAIJSON<{ adaptations: ContactMessagingAdaptation[] }>(
    systemPrompt,
    userPrompt,
    { temperature: 0.4, maxTokens: 3000, label: 'openai_contact_adaptation' }
  );

  return (result.adaptations || []).map((a) => ({
    ...a,
    needs_review: a.intelligence_confidence < LOW_CONFIDENCE_THRESHOLD ? true : (a.needs_review ?? false),
  }));
}

// ─── 3. Per-Segment Email Variant Generation ────────────────────────────────

/**
 * Generate 3 email variants for a specific segment.
 * Each variant has a subject + body tailored to the segment's offer_type + service_line.
 */
export async function generateSegmentVariants(
  segmentKey: SegmentKey,
  segmentContext: {
    offer_type: OfferType;
    service_line: ServiceLine;
    company_count: number;
    sample_companies: string[];
    dominant_buyer_titles: string[];
    sample_signals: string[];
  },
  contextFiles?: { emailPrinciples?: string; useCaseGuide?: string; additionalContext?: string }
): Promise<SegmentVariant[]> {
  const emailPrinciples = contextFiles?.emailPrinciples || loadContextFile('context/copywriting/email-principles.md');
  const useCaseGuide = contextFiles?.useCaseGuide || loadContextFile('context/principles/use-case-driven.md');

  // Get dynamic context from memory if available
  let dynamicContext = '';
  if (buildDynamicContextFn) {
    try {
      dynamicContext = await buildDynamicContextFn();
    } catch { /* ignore */ }
  }

  const offerLabel = segmentContext.offer_type === 'individual_placement'
    ? 'individual engineer placement'
    : 'pod/team delivery (3+ engineers)';

  const serviceLabel: Record<ServiceLine, string> = {
    data_engineering: 'Data Engineering',
    ml_ai: 'Machine Learning / AI',
    cloud_infrastructure: 'Cloud & Platform Infrastructure',
    software_development: 'Software Development',
    cyber_security: 'Cyber Security',
  };

  const systemPrompt = `You are an expert B2B outreach copywriter for CirrusLabs, a staffing company.

Write emails that convert. Follow the principles below exactly. Never use generic filler.

${emailPrinciples}

${useCaseGuide ? `\n--- USE CASE GUIDE ---\n${useCaseGuide}\n---` : ''}
${dynamicContext ? `\n--- LEARNINGS FROM PAST CAMPAIGNS ---\n${dynamicContext}\n---` : ''}
${contextFiles?.additionalContext ? `\n--- VERTICAL CONTEXT ---\n${contextFiles.additionalContext}\n---` : ''}`;

  const userPrompt = `Generate 3 email variants for the following segment:

SEGMENT: ${segmentKey}
- Offer type: ${offerLabel}
- Service line: ${serviceLabel[segmentContext.service_line]}
- Companies in segment: ${segmentContext.company_count}
- Sample companies: ${segmentContext.sample_companies.slice(0, 5).join(', ')}
- Common buyer titles: ${segmentContext.dominant_buyer_titles.join(', ')}
- Sample hiring signals: ${segmentContext.sample_signals.slice(0, 3).join('; ')}

REQUIREMENTS:
- Each variant must use Apollo template variables: {{first_name}}, {{company}}, {{title}}
- Subject lines should be compelling, short, and reference the hiring signal
- Body: 100-150 words, reference the specific signal, include a concrete CTA with specific times
- Each variant should take a different angle (e.g., speed, proof/social proof, problem-first)
- Sign off as "Ashir"
- Tailor the messaging to ${offerLabel} for ${serviceLabel[segmentContext.service_line]} roles

Return a JSON object with key "variants" containing an array of 3 items. Each item must have:
- variant_number (1, 2, or 3)
- subject (string — use {{company}}, {{title}} Apollo variables)
- body (string — use {{first_name}}, {{company}}, {{title}} Apollo variables)`;

  const result = await callOpenAIJSON<{ variants: Array<{ variant_number: number; subject: string; body: string }> }>(
    systemPrompt,
    userPrompt,
    { temperature: 0.7, maxTokens: 2500, label: 'openai_segment_variants' }
  );

  return (result.variants || []).map((v) => ({
    segment_key: segmentKey,
    variant_number: v.variant_number,
    subject: v.subject,
    body: v.body,
  }));
}
