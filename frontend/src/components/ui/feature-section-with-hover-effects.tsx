import { cn } from "@/lib/utils";
import {
  IconAdjustmentsBolt,
  IconCloud,
  IconCurrencyDollar,
  IconEaseInOut,
  IconHeart,
  IconHelp,
  IconRouteAltLeft,
  IconTerminal2,
} from "@tabler/icons-react";

export function FeaturesSectionWithHoverEffects() {
  const features = [
    {
      title: "Signal-First Targeting",
      description:
        "Apollo scans for companies actively hiring AI, Data, and Cloud engineers — catching the exact moment they need help.",
      icon: <IconAdjustmentsBolt />,
    },
    {
      title: "ICP Score Threshold",
      description:
        "Every company is scored before enrichment. Only 170+ point matches consume API credits — zero waste.",
      icon: <IconRouteAltLeft />,
    },
    {
      title: "AI Copy That Converts",
      description:
        "OpenAI generates personalized outreach referencing the exact hiring signal. No templates, no generic filler.",
      icon: <IconTerminal2 />,
    },
    {
      title: "One-Command Pipeline",
      description:
        "npm run pipeline executes all 6 skills sequentially. Skip logic means completed steps are never repeated.",
      icon: <IconEaseInOut />,
    },
    {
      title: "Apollo Sequences",
      description:
        "Contacts push directly into Apollo sequences — 4 touchpoints at day 0, 3, 7, and 14 with reply detection.",
      icon: <IconCloud />,
    },
    {
      title: "Learning Flywheel",
      description:
        "Skill 6 classifies replies and updates what-works.md. Every campaign informs the next one automatically.",
      icon: <IconHelp />,
    },
    {
      title: "$3–5 Per Campaign",
      description:
        "Apollo covers signals, enrichment, and sequencing in one platform. Total cost is a fraction of legacy tools.",
      icon: <IconCurrencyDollar />,
    },
    {
      title: "Full Audit Trail",
      description:
        "Every company, contact, email, and API call is logged to Supabase with cost tracking and deduplication.",
      icon: <IconHeart />,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 relative z-10 py-10 max-w-7xl mx-auto">
      {features.map((feature, index) => (
        <Feature key={feature.title} {...feature} index={index} />
      ))}
    </div>
  );
}

const Feature = ({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r py-10 relative group/feature dark:border-neutral-800",
        (index === 0 || index === 4) && "lg:border-l dark:border-neutral-800",
        index < 4 && "lg:border-b dark:border-neutral-800"
      )}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-neutral-100 dark:from-neutral-800 to-transparent pointer-events-none" />
      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-neutral-100 dark:from-neutral-800 to-transparent pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-neutral-600 dark:text-neutral-400">
        {icon}
      </div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-neutral-300 dark:bg-neutral-700 group-hover/feature:bg-indigo-500 transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-neutral-800 dark:text-neutral-100">
          {title}
        </span>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  );
};
