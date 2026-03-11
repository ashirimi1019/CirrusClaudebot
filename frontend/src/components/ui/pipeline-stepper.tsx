'use client';

import React from 'react';
import { SkillStepCard, SkillStatus } from './skill-step-card';

export interface StatusData {
  skill1: boolean;
  skill2: boolean;
  skill3: boolean;
  skill4: boolean;
  skill5: boolean;
  skill6: boolean;
}

export interface SkillRunSummary {
  skill_number: number;
  started_at: string;
  status: string;
}

interface StepDef {
  skillNum: number;
  title: string;
  description: string;
  cost?: string;
  outputLabel?: string;
}

const STEPS: StepDef[] = [
  {
    skillNum: 1,
    title: 'New Offer',
    description: 'Define positioning canvas — ICP, value prop, differentiators',
    cost: 'Free',
  },
  {
    skillNum: 2,
    title: 'Campaign Strategy',
    description: 'Signal targeting, messaging framework, buyer filters',
    cost: 'Free',
  },
  {
    skillNum: 3,
    title: 'Campaign Copy',
    description: 'Generate 3 email + 3 LinkedIn variants via OpenAI',
    cost: '~$0.50',
  },
  {
    skillNum: 4,
    title: 'Find Leads',
    description: 'Search Apollo.io for matching companies + decision-makers',
    cost: '~$2–5',
  },
  {
    skillNum: 5,
    title: 'Launch Outreach',
    description: 'Auto-personalize placeholders, export messages.csv',
    cost: 'Free',
  },
  {
    skillNum: 6,
    title: 'Campaign Review',
    description: 'Analyze results, calculate rates, update learnings file',
    cost: 'Free',
  },
];

interface PipelineStepperProps {
  statusData: StatusData | null;
  runningSkill: number | null;
  onRunSkill: (skillNum: number) => void;
  recentRuns?: SkillRunSummary[];
}

export function PipelineStepper({
  statusData,
  runningSkill,
  onRunSkill,
  recentRuns = [],
}: PipelineStepperProps) {
  function getStatus(skillNum: number): SkillStatus {
    if (runningSkill === skillNum) return 'running';
    const isDone = statusData?.[`skill${skillNum}` as keyof StatusData] ?? false;
    if (isDone) return 'done';
    if (skillNum === 1) return 'ready';
    const prevDone = statusData?.[`skill${skillNum - 1}` as keyof StatusData] ?? false;
    return prevDone ? 'ready' : 'locked';
  }

  // Find the first step that is 'ready' to highlight as next
  const nextReadySkill = STEPS.find((s) => getStatus(s.skillNum) === 'ready')?.skillNum ?? null;

  // Get last run timestamp per skill
  function getLastRunAt(skillNum: number): string | null {
    const runs = recentRuns.filter((r) => r.skill_number === skillNum && r.status === 'success');
    if (runs.length === 0) return null;
    return runs[0].started_at;
  }

  return (
    <div className="flex flex-col">
      {STEPS.map((step, idx) => {
        const status = getStatus(step.skillNum);
        const lastRunAt = getLastRunAt(step.skillNum);
        const hasOutput = statusData?.[`skill${step.skillNum}` as keyof StatusData] ?? false;

        return (
          <div key={step.skillNum} className="relative">
            <SkillStepCard
              skillNum={step.skillNum}
              title={step.title}
              description={step.description}
              cost={step.cost}
              status={status}
              onRun={() => onRunSkill(step.skillNum)}
              isActive={runningSkill === step.skillNum}
              lastRunAt={lastRunAt}
              hasOutput={hasOutput}
              isNext={status === 'ready' && step.skillNum === nextReadySkill}
            />
            {/* Connector line between steps */}
            {idx < STEPS.length - 1 && (
              <div
                className={`absolute left-[27px] top-full w-px transition-colors ${
                  status === 'done' ? 'bg-emerald-500/30 h-3' : 'bg-neutral-800 h-3'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
