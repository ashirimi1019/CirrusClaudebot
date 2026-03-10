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

interface StepDef {
  skillNum: number;
  title: string;
  description: string;
  cost?: string;
}

const STEPS: StepDef[] = [
  {
    skillNum: 1,
    title: 'New Offer',
    description: 'Define positioning canvas (13 sections)',
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
    description: 'Search Apollo.io for companies + decision-makers',
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
    description: 'Analyze results and update learnings',
    cost: 'Free',
  },
];

interface PipelineStepperProps {
  statusData: StatusData | null;
  runningSkill: number | null;
  onRunSkill: (skillNum: number) => void;
}

export function PipelineStepper({
  statusData,
  runningSkill,
  onRunSkill,
}: PipelineStepperProps) {
  function getStatus(skillNum: number): SkillStatus {
    if (runningSkill === skillNum) return 'running';

    const isDone = statusData?.[`skill${skillNum}` as keyof StatusData] ?? false;
    if (isDone) return 'done';

    // Skill 1 is always ready (no prerequisites)
    if (skillNum === 1) return 'ready';

    // Otherwise check if previous skill is done
    const prevDone = statusData?.[`skill${skillNum - 1}` as keyof StatusData] ?? false;
    return prevDone ? 'ready' : 'locked';
  }

  return (
    <div className="flex flex-col gap-1.5">
      {STEPS.map((step, idx) => {
        const status = getStatus(step.skillNum);
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
            />
            {/* Connector line between steps */}
            {idx < STEPS.length - 1 && (
              <div className="absolute left-8 top-full h-1.5 w-0.5 bg-neutral-800 translate-x-[-0.5px]" />
            )}
          </div>
        );
      })}
    </div>
  );
}
