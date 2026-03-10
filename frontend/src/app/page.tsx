"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Zap,
  Users,
  BarChart3,
  Target,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Mail,
  Search,
  TrendingUp,
} from "lucide-react";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";
import { FeaturesSectionWithHoverEffects } from "@/components/ui/feature-section-with-hover-effects";
import { cn } from "@/lib/utils";

// ─── Stats Bar ──────────────────────────────────────────────────────────────
function StatsBar() {
  const stats = [
    { label: "Companies / week", value: "50–150", icon: Search },
    { label: "Contacts / week", value: "200–400", icon: Users },
    { label: "Emails / month", value: "500–1K", icon: Mail },
    { label: "Discovery calls", value: "10–30", icon: TrendingUp },
  ];

  return (
    <section className="relative z-10 -mt-20 mx-auto max-w-5xl px-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.2 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl"
      >
        {stats.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="bg-[#0a0a0a] px-6 py-6 flex flex-col items-center gap-2 text-center"
          >
            <Icon className="h-5 w-5 text-indigo-400/70" />
            <span className="text-2xl font-bold text-white">{value}</span>
            <span className="text-xs text-white/40 tracking-wide uppercase">{label}</span>
          </div>
        ))}
      </motion.div>
    </section>
  );
}

// ─── How It Works ───────────────────────────────────────────────────────────
const steps = [
  {
    number: "01",
    icon: Search,
    title: "Signal Detection",
    description:
      "Apollo scans for companies actively hiring AI, Data, Cloud, or Cybersecurity engineers — the exact moment they need help.",
    color: "from-indigo-500/20 to-indigo-500/5",
    accent: "text-indigo-400",
    border: "border-indigo-500/20",
  },
  {
    number: "02",
    icon: Target,
    title: "ICP Scoring",
    description:
      "Every company is scored against your ICP — size, funding stage, geography, tech stack. Only 170+ scores pass to enrichment.",
    color: "from-violet-500/20 to-violet-500/5",
    accent: "text-violet-400",
    border: "border-violet-500/20",
  },
  {
    number: "03",
    icon: Users,
    title: "Decision-Maker Discovery",
    description:
      "Apollo finds CTOs, VP Engineering, Founders, and Heads of Data at qualifying companies with verified email and LinkedIn.",
    color: "from-rose-500/20 to-rose-500/5",
    accent: "text-rose-400",
    border: "border-rose-500/20",
  },
  {
    number: "04",
    icon: Sparkles,
    title: "AI Personalization",
    description:
      "OpenAI generates human-quality copy tailored to each hiring signal. Snowflake hire → references data stack. AI hire → references LLM infra.",
    color: "from-amber-500/20 to-amber-500/5",
    accent: "text-amber-400",
    border: "border-amber-500/20",
  },
  {
    number: "05",
    icon: Mail,
    title: "Sequence Launch",
    description:
      "Contacts are pushed directly into Apollo sequences — 4 touchpoints, day 0/3/7/14. Apollo handles delivery, throttling, and unsubscribes.",
    color: "from-cyan-500/20 to-cyan-500/5",
    accent: "text-cyan-400",
    border: "border-cyan-500/20",
  },
  {
    number: "06",
    icon: BarChart3,
    title: "Review & Learn",
    description:
      "After each campaign, Skill 6 pulls Apollo metrics and AI classifies replies. Learnings feed back into the next campaign's prompts.",
    color: "from-emerald-500/20 to-emerald-500/5",
    accent: "text-emerald-400",
    border: "border-emerald-500/20",
  },
];

function HowItWorks() {
  return (
    <section className="relative py-32 px-4 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-20"
      >
        <span className="text-xs tracking-[0.2em] uppercase text-indigo-400/80 font-medium mb-4 block">
          The Engine
        </span>
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
          Six skills. One pipeline.
        </h2>
        <p className="text-white/40 text-lg max-w-xl mx-auto">
          Every step runs automatically from a single config file.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {steps.map((step, i) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className={cn(
              "group relative rounded-2xl p-6 border",
              "bg-gradient-to-b",
              step.color,
              step.border,
              "hover:border-white/20 transition-colors duration-300"
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={cn(
                  "p-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08]"
                )}
              >
                <step.icon className={cn("h-5 w-5", step.accent)} />
              </div>
              <span className="text-4xl font-black text-white/[0.04] select-none">
                {step.number}
              </span>
            </div>
            <h3 className="text-white font-semibold text-lg mb-2 tracking-tight">
              {step.title}
            </h3>
            <p className="text-white/40 text-sm leading-relaxed">
              {step.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ─── Why It Works ────────────────────────────────────────────────────────────
function WhyItWorks() {
  return (
    <section className="relative border-t border-white/[0.06] px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center pt-20 pb-4"
        >
          <span className="text-xs tracking-[0.2em] uppercase text-indigo-400/80 font-medium mb-4 block">
            Why it works
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Everything you need.
            <br />
            <span className="text-white/30">Nothing you don&apos;t.</span>
          </h2>
        </motion.div>
        <FeaturesSectionWithHoverEffects />
      </div>
    </section>
  );
}

// ─── Pipeline Command ────────────────────────────────────────────────────────
function PipelineSection() {
  const commands = [
    {
      cmd: "npm run pipeline",
      label: "Run full pipeline (Skills 1–5)",
      highlight: true,
    },
    { cmd: "npm run skill:3 -- offer campaign", label: "Re-generate copy only" },
    { cmd: "npm run skill:4 -- offer campaign", label: "Re-find leads only" },
    {
      cmd: "npm run skill:6 -- offer campaign",
      label: "Review results after 14 days",
    },
    { cmd: "npm run sheets:sync", label: "Export to Google Sheets" },
  ];

  return (
    <section className="relative py-24 px-4 max-w-5xl mx-auto">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-xs tracking-[0.2em] uppercase text-indigo-400/80 font-medium mb-4 block">
            Zero friction
          </span>
          <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
            One command to
            <br />
            run everything.
          </h2>
          <p className="text-white/40 leading-relaxed mb-8">
            Fill in{" "}
            <code className="text-indigo-300 bg-white/[0.05] px-1.5 py-0.5 rounded text-sm">
              campaign.config.json
            </code>{" "}
            once. Every skill reads from it and skips steps that are already
            complete.
          </p>
          <ul className="space-y-3">
            {[
              "Skip if output already exists",
              "Apollo sequences auto-created",
              "Supabase + Google Sheets updated",
              "Learnings fed back into prompts",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-white/60">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="rounded-2xl bg-[#0d0d0d] border border-white/[0.08] overflow-hidden"
        >
          {/* Terminal header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
            <div className="h-3 w-3 rounded-full bg-rose-500/60" />
            <div className="h-3 w-3 rounded-full bg-amber-500/60" />
            <div className="h-3 w-3 rounded-full bg-emerald-500/60" />
            <span className="ml-2 text-xs text-white/30 font-mono">
              terminal
            </span>
          </div>
          {/* Commands */}
          <div className="p-5 space-y-3 font-mono text-sm">
            {commands.map(({ cmd, label, highlight }) => (
              <div key={cmd} className="group/cmd">
                <div
                  className={cn(
                    "flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    highlight
                      ? "bg-indigo-500/10 border border-indigo-500/20"
                      : "hover:bg-white/[0.03]"
                  )}
                >
                  <span
                    className={cn(
                      "shrink-0 mt-0.5",
                      highlight ? "text-indigo-400" : "text-white/20"
                    )}
                  >
                    $
                  </span>
                  <div>
                    <div
                      className={cn(
                        highlight ? "text-indigo-300" : "text-white/70"
                      )}
                    >
                      {cmd}
                    </div>
                    <div className="text-white/25 text-xs mt-0.5">{label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Tech Stack ──────────────────────────────────────────────────────────────
function TechStack() {
  const tools = [
    { name: "Apollo.io", role: "Signal detection · Sequences · Analytics" },
    { name: "OpenAI", role: "ICP scoring · Copy generation · Reply classification" },
    { name: "Supabase", role: "Companies · Contacts · Campaign data" },
    { name: "Google Sheets", role: "Stakeholder visibility · Export" },
  ];

  return (
    <section className="relative py-20 px-4 border-t border-white/[0.06]">
      <div className="max-w-5xl mx-auto">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-white/25 text-sm tracking-widest uppercase mb-10"
        >
          Powered by
        </motion.p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.04] rounded-xl overflow-hidden border border-white/[0.06]">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.name}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#0a0a0a] px-6 py-8 text-center"
            >
              <div className="text-white font-semibold mb-1">{tool.name}</div>
              <div className="text-white/30 text-xs leading-relaxed">{tool.role}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA Footer ──────────────────────────────────────────────────────────────
function CTAFooter() {
  return (
    <section className="relative py-32 px-4 text-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/[0.03] to-transparent" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative max-w-2xl mx-auto"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-8">
          <Zap className="h-3 w-3 text-amber-400" />
          <span className="text-sm text-white/50">Ready in 30 minutes</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
          Your first campaign,
          <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300">
            this week.
          </span>
        </h2>
        <p className="text-white/40 text-lg mb-10 leading-relaxed">
          Run Skills 1–3 for free. Skills 4–5 cost ~$3–5 per campaign in Apollo
          credits.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/dashboard/offers" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors">
            Get started
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.1] text-white/80 font-medium transition-colors">
            View dashboard
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <main className="min-h-screen bg-[#030303]">
      <HeroGeometric
        badge="CirrusLabs GTM Engine"
        title1="Signal-Driven"
        title2="Outbound, Automated"
      />
      <StatsBar />
      <HowItWorks />
      <WhyItWorks />
      <PipelineSection />
      <TechStack />
      <CTAFooter />
    </main>
  );
}
