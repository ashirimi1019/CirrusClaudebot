/**
 * SKILL 6: CAMPAIGN REVIEW (Apollo.io Analytics)
 * Pulls sequence metrics from Apollo and analyzes campaign results
 * Input: Offer slug + Campaign slug + Apollo sequence ID (automated) OR interactive CLI
 * Output: learnings.md + updated what-works.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  listSequences,
  getSequenceMetrics,
  getSequenceReplies,
  type SequenceMetrics,
  type ApolloReply,
} from '../../lib/clients/apollo.ts';
import { SkillRunTracker } from '../../lib/services/run-tracker.ts';
import { validateSkillInputs } from '../../lib/services/validation.ts';
import { buildSkillContext } from '../../lib/verticals/index.ts';
import { getSupabaseClient } from '../../lib/supabase.ts';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ReviewConfig {
  apolloSequenceId: string;
  meetings?: number;
  closed?: number;
  autoMode?: boolean;  // if true, skip manual insight prompts
}

function createReadlineInterface(): readline.Interface {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

async function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, (a) => resolve(a.trim())));
}

/**
 * Run Skill 6.
 * - If `offerSlug` + `campaignSlug` + `config` provided: auto-pulls metrics, skips most prompts
 * - Otherwise: falls back to fully interactive mode
 */
export async function runSkill6CampaignReview(
  offerSlugArg?: string,
  campaignSlugArg?: string,
  config?: ReviewConfig
): Promise<void> {
  const tracker = new SkillRunTracker('SKILL 6: CAMPAIGN REVIEW (Apollo Analytics)');
  tracker.step('Validate inputs');
  tracker.step('Load vertical context');
  tracker.step('Resolve Apollo sequence');
  tracker.step('Pull metrics from Apollo');
  tracker.step('Gather qualitative inputs');
  tracker.step('Write learnings.md');
  tracker.step('Update what-works.md');

  const cliMode = !!(process.argv[2] && process.argv[3] && !config);
  const autoMode = !!(config?.autoMode || cliMode);
  const rl = autoMode ? null : createReadlineInterface();

  try {
    // ─── Step 1: Validate inputs ───
    tracker.startStep('Validate inputs');
    let offerSlug: string;
    let campaignSlug: string;

    if (offerSlugArg && campaignSlugArg) {
      offerSlug = offerSlugArg;
      campaignSlug = campaignSlugArg;
      console.log(`📋 Pipeline mode: offer=${offerSlug}, campaign=${campaignSlug}`);
    } else if (process.argv[2] && process.argv[3]) {
      offerSlug = process.argv[2];
      campaignSlug = process.argv[3];
    } else {
      offerSlug = await prompt(rl!, 'Enter offer slug: ');
      campaignSlug = await prompt(rl!, 'Enter campaign slug: ');
    }

    const validation = validateSkillInputs({
      offerSlug,
      campaignSlug,
      requirePositioning: true,
    });
    if (!validation.valid) {
      tracker.failStep('Validate inputs', validation.errors.join('; '));
      tracker.printSummary();
      if (rl) rl.close();
      throw new Error(`Skill 6 input validation failed:\n  ${validation.errors.join('\n  ')}`);
    }
    if (validation.warnings.length > 0) {
      validation.warnings.forEach((w) => tracker.warn(w));
    }
    tracker.completeStep('Validate inputs', `offer="${offerSlug}", campaign="${campaignSlug}"`);

    // ─── Step 1b: Load vertical context (if configured) ───
    tracker.startStep('Load vertical context');
    let verticalContext = '';
    let effectiveVerticalSlug: string | null = null;
    try {
      const sb = getSupabaseClient();
      const { data: offerRow } = await sb
        .from('offers')
        .select('id')
        .eq('slug', offerSlug)
        .single();

      if (offerRow?.id) {
        const { data: campaignRow } = await sb
          .from('campaigns')
          .select('id')
          .eq('offer_id', offerRow.id)
          .eq('slug', campaignSlug)
          .single();

        const verticalCtx = await buildSkillContext('skill-6', offerRow.id, campaignRow?.id);
        if (verticalCtx.effectiveVertical) {
          verticalContext = verticalCtx.context;
          effectiveVerticalSlug = verticalCtx.effectiveVertical;
          tracker.completeStep(
            'Load vertical context',
            `vertical="${verticalCtx.effectiveVerticalName}", sections=[${verticalCtx.loadedSections.join(', ')}]`
          );
        } else {
          tracker.completeStep('Load vertical context', 'No vertical configured — using base review');
        }
      } else {
        tracker.completeStep('Load vertical context', 'Skipped — offer not found in DB');
      }
    } catch (err) {
      tracker.partialStep(
        'Load vertical context',
        `Warning: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // ─── Step 2: Resolve Apollo sequence ───
    tracker.startStep('Resolve Apollo sequence');
    let sequenceId: string;
    let sequenceName: string;

    if (config?.apolloSequenceId) {
      sequenceId = config.apolloSequenceId;
      sequenceName = campaignSlug;
      console.log(`✅ Using configured sequence ID: ${sequenceId}`);
      tracker.completeStep('Resolve Apollo sequence', `Configured ID: ${sequenceId}`);
    } else {
      console.log('\n🔗 Loading Apollo sequences...');
      let sequences: any[] = [];
      try {
        sequences = await listSequences();
      } catch (seqErr: any) {
        tracker.warn(`Failed to list sequences: ${seqErr.message}`);
      }

      if (autoMode || sequences.length === 0) {
        // In auto mode without an ID, try to match by campaign name
        const matched = sequences.find((s: any) =>
          s.name.toLowerCase().includes(campaignSlug.toLowerCase())
        );
        if (matched) {
          sequenceId = matched.id;
          sequenceName = matched.name;
          console.log(`✅ Auto-matched sequence: "${sequenceName}"`);
          tracker.completeStep('Resolve Apollo sequence', `Auto-matched: "${sequenceName}"`);
        } else {
          sequenceId = '';
          sequenceName = campaignSlug;
          tracker.partialStep('Resolve Apollo sequence', 'No matching sequence found. Metrics pull will be skipped.');
          tracker.warn('Provide apolloSequenceId in config or ensure sequence name contains the campaign slug.');
        }
      } else {
        // Interactive: show sequence list
        if (process.argv[4]) {
          // Sequence ID passed as 4th arg
          sequenceId = process.argv[4];
          sequenceName = sequences.find((s: any) => s.id === sequenceId)?.name || campaignSlug;
        } else {
          console.log('\nSequences found:');
          sequences.forEach((s: any, i: number) => {
            console.log(`  [${i + 1}] ${s.name} (ID: ${s.id}, ${s.num_contacts} contacts)`);
          });

          const choice = await prompt(rl!, '\nSelect sequence number (or paste ID directly): ');
          const idx = parseInt(choice) - 1;

          if (!isNaN(idx) && idx >= 0 && idx < sequences.length) {
            sequenceId = sequences[idx].id;
            sequenceName = sequences[idx].name;
          } else {
            sequenceId = choice;
            sequenceName = campaignSlug;
          }
        }
        tracker.completeStep('Resolve Apollo sequence', `"${sequenceName}" (ID: ${sequenceId})`);
      }
    }

    // ─── Step 3: Pull metrics from Apollo ───
    tracker.startStep('Pull metrics from Apollo');
    let metrics: SequenceMetrics | null = null;
    let replies: ApolloReply[] = [];
    let metricsPulled = false;
    let repliesPulled = false;

    if (sequenceId) {
      try {
        metrics = await getSequenceMetrics(sequenceId);
        metricsPulled = true;
        console.log('\n📊 Apollo Sequence Metrics:');
        console.log(`  Contacts:     ${metrics.contacts_count}`);
        console.log(`  Emails sent:  ${metrics.emails_sent}`);
        console.log(`  Open rate:    ${(metrics.open_rate * 100).toFixed(1)}%`);
        console.log(`  Reply rate:   ${(metrics.reply_rate * 100).toFixed(1)}%`);
        console.log(`  Bounce rate:  ${(metrics.bounce_rate * 100).toFixed(1)}%`);
      } catch (err: any) {
        tracker.warn(`Could not fetch sequence metrics: ${err.message}`);
      }

      try {
        replies = await getSequenceReplies(sequenceId);
        repliesPulled = true;
        console.log(`💬 Replies pulled: ${replies.length}`);
      } catch (err: any) {
        tracker.warn(`Could not fetch sequence replies: ${err.message}`);
      }

      if (metricsPulled && repliesPulled) {
        tracker.completeStep('Pull metrics from Apollo', `${metrics?.emails_sent ?? 0} emails, ${replies.length} replies`);
      } else if (metricsPulled || repliesPulled) {
        tracker.partialStep('Pull metrics from Apollo', `metrics=${metricsPulled ? 'yes' : 'failed'}, replies=${repliesPulled ? 'yes' : 'failed'}`);
      } else {
        tracker.partialStep('Pull metrics from Apollo', 'Both metrics and replies pulls failed. Check Apollo API key and sequence ID.');
      }
    } else {
      tracker.skipStep('Pull metrics from Apollo', 'No sequence ID resolved — using manual/default values');
    }

    const emailsSent = metrics?.emails_sent ?? 0;
    const totalReplies = replies.length;
    const openRate = metrics ? (metrics.open_rate * 100).toFixed(1) : '0';

    if (emailsSent === 0 && totalReplies === 0) {
      tracker.warn('Both emailsSent and totalReplies are 0. Campaign may not have been launched or metrics are not yet available.');
    }

    // ─── Step 4: Gather qualitative inputs ───
    tracker.startStep('Gather qualitative inputs');
    let meetings: number;
    let closed: number;
    let bestVariant: string;
    let worstVariant: string;
    let bestTitle: string;
    let objections: string;
    let wins: string;
    let mistakes: string;

    if (autoMode) {
      // Auto-mode: use provided values or defaults
      meetings = config?.meetings ?? 0;
      closed = config?.closed ?? 0;
      bestVariant = 'email-variant-1';
      worstVariant = 'unknown';
      bestTitle = 'CTO';
      objections = 'none recorded';
      wins = `Open rate: ${openRate}%, Reply rate: ${totalReplies > 0 ? ((totalReplies / Math.max(emailsSent, 1)) * 100).toFixed(1) : 0}%`;
      mistakes = 'none recorded - review Apollo dashboard for details';
      tracker.completeStep('Gather qualitative inputs', 'Auto-mode defaults applied');
    } else {
      // Interactive
      console.log('\n📝 Enter additional metrics (cannot be auto-pulled from Apollo):\n');

      const emailsSentInput = await prompt(rl!, `Emails sent (Apollo shows ${emailsSent}, confirm or override): `);
      const confirmedEmailsSent = parseInt(emailsSentInput) || emailsSent;

      const repliesInput = await prompt(rl!, `Total replies (Apollo shows ${totalReplies}, confirm or override): `);
      const confirmedReplies = parseInt(repliesInput) || totalReplies;

      meetings = parseInt(await prompt(rl!, 'Meetings booked: ') || '0', 10);
      closed = parseInt(await prompt(rl!, 'Deals closed: ') || '0', 10);
      bestVariant = await prompt(rl!, 'Best performing email variant (e.g., "email-variant-1"): ');
      worstVariant = await prompt(rl!, 'Worst performing variant (if known): ');
      bestTitle = await prompt(rl!, 'Best responding buyer title (e.g., "CTO"): ');

      console.log('\n💡 Share insights for the learning flywheel:\n');
      objections = await prompt(rl!, 'Common objections heard (comma-separated): ');
      wins = await prompt(rl!, 'What surprised you positively?: ');
      mistakes = await prompt(rl!, "Mistakes you'd avoid next time?: ");

      if (rl) rl.close();
      tracker.completeStep('Gather qualitative inputs', `${meetings} meetings, ${closed} deals closed`);
    }

    // ─── Calculate metrics ───
    const replyRate = emailsSent > 0 ? ((totalReplies / emailsSent) * 100).toFixed(1) : '0';
    const meetingRate = totalReplies > 0 ? ((meetings / totalReplies) * 100).toFixed(1) : '0';
    const closeRate = meetings > 0 ? ((closed / meetings) * 100).toFixed(1) : '0';

    const replySample = replies
      .slice(0, 5)
      .map((r) => `- ${r.contact_name} (${r.contact_email}): "${r.body_text.substring(0, 100)}..."`)
      .join('\n');

    // ─── Step 5: Write learnings file ───
    tracker.startStep('Write learnings.md');
    const learningsContent = `# Campaign Review: ${campaignSlug}

**Offer:** ${offerSlug}
**Apollo Sequence:** ${sequenceName} (ID: ${sequenceId || 'N/A'})
**Reviewed:** ${new Date().toISOString()}

---

## Results Summary

| Metric | Value |
|--------|-------|
| Emails Sent | ${emailsSent} |
| Open Rate | ${openRate}% |
| Replies | ${totalReplies} |
| Reply Rate | ${replyRate}% |
| Meetings Booked | ${meetings} |
| Meeting Rate (of replies) | ${meetingRate}% |
| Deals Closed | ${closed} |
| Close Rate (of meetings) | ${closeRate}% |
| Bounce Rate | ${metrics ? (metrics.bounce_rate * 100).toFixed(1) : 'N/A'}% |

---

## Performance Analysis

### Best Performing Email Variant
\`${bestVariant}\`

### Worst Performing Variant
\`${worstVariant}\`

### Best Responding Buyer Title
\`${bestTitle}\`

---

## Reply Sample (from Apollo)

${replySample || '(No replies pulled — check Apollo dashboard)'}

---

## Feedback & Objections

${objections.split(',').map((o: string) => `- ${o.trim()}`).join('\n')}

---

## Wins
${wins}

---

## Mistakes to Avoid Next Time
${mistakes}

---

## Recommendations for Next Campaign

1. **Double down on:** ${bestVariant}
2. **Avoid:** ${worstVariant}
3. **Prioritize buyer title:** ${bestTitle}
4. **Pre-empt objections:** ${objections}
${verticalContext ? `
---

## Vertical Context

${verticalContext}
` : ''}
---

Generated: ${new Date().toISOString()}
`;

    const learningsPath = path.join(process.cwd(), 'offers', offerSlug, 'campaigns', campaignSlugArg || campaignSlug, 'results', 'learnings.md');
    fs.mkdirSync(path.dirname(learningsPath), { recursive: true });
    fs.writeFileSync(learningsPath, learningsContent);
    tracker.completeStep('Write learnings.md', learningsPath);

    // ─── Step 6: Update what-works.md ───
    tracker.startStep('Update what-works.md');
    const whatWorksPath = path.join(process.cwd(), 'context', 'learnings', 'what-works.md');

    try {
      const existing = fs.existsSync(whatWorksPath) ? fs.readFileSync(whatWorksPath, 'utf-8') : '';

      const update =
        `\n\n---\n\n## Campaign: ${campaignSlug} (${new Date().toLocaleDateString()})\n\n` +
        `- **Sequence:** ${sequenceName}\n` +
        `- **Emails sent:** ${emailsSent}\n` +
        `- **Open rate:** ${openRate}%\n` +
        `- **Reply rate:** ${replyRate}%\n` +
        `- **Meetings booked:** ${meetings}\n` +
        `- **Best variant:** ${bestVariant}\n` +
        `- **Best buyer title:** ${bestTitle}\n` +
        `- **Key learning:** ${wins}\n`;

      fs.writeFileSync(whatWorksPath, existing + update);
      tracker.completeStep('Update what-works.md', whatWorksPath);

      // Also write to per-vertical learnings if a vertical is active
      if (effectiveVerticalSlug) {
        try {
          const verticalLearningsDir = path.join(process.cwd(), 'context', 'verticals', effectiveVerticalSlug, 'learnings');
          fs.mkdirSync(verticalLearningsDir, { recursive: true });
          const verticalWhatWorksPath = path.join(verticalLearningsDir, 'what-works.md');
          const existingVertical = fs.existsSync(verticalWhatWorksPath) ? fs.readFileSync(verticalWhatWorksPath, 'utf-8') : `# What Works — ${effectiveVerticalSlug}\n\nVertical-specific campaign learnings.\n`;
          fs.writeFileSync(verticalWhatWorksPath, existingVertical + update);
          console.log(`  📁 Also updated vertical learnings: ${verticalWhatWorksPath}`);
        } catch (vertErr: any) {
          tracker.warn(`Per-vertical learnings write failed: ${vertErr.message}`);
        }
      }
    } catch (wwErr: any) {
      tracker.partialStep('Update what-works.md', `Failed to update: ${wwErr.message}. Learnings.md was saved.`);
      tracker.warn(`what-works.md update failed: ${wwErr.message}. Ensure context/learnings/ directory exists.`);
    }

    tracker.printSummary();
    console.log(`\n  Open rate:    ${openRate}%`);
    console.log(`  Reply rate:   ${replyRate}% (${totalReplies} replies)`);
    console.log(`  Meetings:     ${meetings}`);
    console.log(`  Deals closed: ${closed}`);
    console.log('\n💡 Learnings added to context/learnings/what-works.md');
    if (effectiveVerticalSlug) {
      console.log(`📁 Vertical learnings: context/verticals/${effectiveVerticalSlug}/learnings/what-works.md`);
    }
    console.log('🔄 Flywheel complete! Next campaign will be smarter.');
  } catch (err: any) {
    if (rl) rl.close();
    // Re-throw — don't process.exit so callers can handle
    throw err;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // Support: npm run skill:6 -- offer-slug campaign-slug [sequenceId]
  await runSkill6CampaignReview(process.argv[2], process.argv[3]);
}
