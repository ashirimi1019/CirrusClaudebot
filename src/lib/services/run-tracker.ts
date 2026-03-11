/**
 * Run Tracker Service
 * Tracks skill execution progress for operator transparency.
 * Makes it clear what started, completed, partially completed, or failed.
 */

export interface RunStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed' | 'partial';
  detail?: string;
  startedAt?: number;
  durationMs?: number;
  count?: number;       // e.g., number of contacts found
}

export class SkillRunTracker {
  readonly skill: string;
  readonly startedAt: number;
  private steps: RunStep[] = [];
  private warnings: string[] = [];

  constructor(skillName: string) {
    this.skill = skillName;
    this.startedAt = Date.now();
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`  ${skillName}`);
    console.log(`  Started: ${new Date().toISOString()}`);
    console.log(`${'═'.repeat(50)}\n`);
  }

  /** Register a step. Returns the step so callers can update count/detail. */
  step(name: string): RunStep {
    const s: RunStep = { name, status: 'pending' };
    this.steps.push(s);
    return s;
  }

  /** Mark a step as running. */
  startStep(name: string): void {
    const s = this.findStep(name);
    s.status = 'running';
    s.startedAt = Date.now();
    console.log(`\n▶ ${name}...`);
  }

  /** Mark a step as completed with optional detail and count. */
  completeStep(name: string, detail?: string, count?: number): void {
    const s = this.findStep(name);
    s.status = 'completed';
    s.detail = detail;
    s.count = count;
    s.durationMs = s.startedAt ? Date.now() - s.startedAt : undefined;
    const dur = s.durationMs ? ` (${(s.durationMs / 1000).toFixed(1)}s)` : '';
    const cnt = count !== undefined ? ` [${count}]` : '';
    console.log(`  ✅ ${name}${cnt}${dur}${detail ? ` — ${detail}` : ''}`);
  }

  /** Mark a step as partially completed. */
  partialStep(name: string, detail: string, count?: number): void {
    const s = this.findStep(name);
    s.status = 'partial';
    s.detail = detail;
    s.count = count;
    s.durationMs = s.startedAt ? Date.now() - s.startedAt : undefined;
    console.log(`  ⚠️  ${name} — PARTIAL: ${detail}`);
  }

  /** Mark a step as failed. */
  failStep(name: string, reason: string): void {
    const s = this.findStep(name);
    s.status = 'failed';
    s.detail = reason;
    s.durationMs = s.startedAt ? Date.now() - s.startedAt : undefined;
    console.log(`  ❌ ${name} — FAILED: ${reason}`);
  }

  /** Mark a step as skipped. */
  skipStep(name: string, reason: string): void {
    const s = this.findStep(name);
    s.status = 'skipped';
    s.detail = reason;
    console.log(`  ⏭ ${name} — skipped: ${reason}`);
  }

  /** Record a warning. */
  warn(message: string): void {
    this.warnings.push(message);
    console.warn(`  ⚠️  ${message}`);
  }

  /** Print the final run summary. */
  printSummary(): void {
    const totalMs = Date.now() - this.startedAt;
    const completed = this.steps.filter(s => s.status === 'completed');
    const failed = this.steps.filter(s => s.status === 'failed');
    const partial = this.steps.filter(s => s.status === 'partial');
    const skipped = this.steps.filter(s => s.status === 'skipped');

    const allGood = failed.length === 0 && partial.length === 0;
    const status = allGood
      ? '✅ COMPLETE'
      : failed.length > 0
        ? '❌ FAILED'
        : '⚠️  PARTIALLY COMPLETE';

    console.log(`\n${'═'.repeat(50)}`);
    console.log(`  ${this.skill} — ${status}`);
    console.log(`  Duration: ${(totalMs / 1000).toFixed(1)}s`);
    console.log(`${'─'.repeat(50)}`);

    // Step-by-step results
    for (const s of this.steps) {
      const icon = {
        completed: '✅', failed: '❌', partial: '⚠️ ', skipped: '⏭', running: '▶', pending: '⏳',
      }[s.status];
      const cnt = s.count !== undefined ? ` [${s.count}]` : '';
      const det = s.detail ? ` — ${s.detail}` : '';
      console.log(`  ${icon} ${s.name}${cnt}${det}`);
    }

    // Warnings
    if (this.warnings.length > 0) {
      console.log(`${'─'.repeat(50)}`);
      console.log(`  Warnings (${this.warnings.length}):`);
      for (const w of this.warnings) {
        console.log(`    ⚠️  ${w}`);
      }
    }

    console.log(`${'═'.repeat(50)}\n`);
  }

  /** Get overall run status. */
  get overallStatus(): 'complete' | 'partial' | 'failed' {
    const failed = this.steps.filter(s => s.status === 'failed');
    const partial = this.steps.filter(s => s.status === 'partial');
    if (failed.length > 0) return 'failed';
    if (partial.length > 0) return 'partial';
    return 'complete';
  }

  private findStep(name: string): RunStep {
    let s = this.steps.find(x => x.name === name);
    if (!s) {
      s = { name, status: 'pending' };
      this.steps.push(s);
    }
    return s;
  }
}
