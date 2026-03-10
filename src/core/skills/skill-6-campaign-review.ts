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
  console.log('\n========================================');
  console.log('SKILL 6: CAMPAIGN REVIEW (Apollo Analytics)');
  console.log('========================================\n');

  const autoMode = !!(config?.autoMode);
  const rl = autoMode ? null : createReadlineInterface();

  try {
    // ─── Get slugs ───
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

    // ─── Get Apollo sequence ───
    let sequenceId: string;
    let sequenceName: string;

    if (config?.apolloSequenceId) {
      sequenceId = config.apolloSequenceId;
      sequenceName = campaignSlug;
      console.log(`✅ Using configured sequence ID: ${sequenceId}`);
    } else {
      console.log('\n🔗 Loading Apollo sequences...');
      const sequences = await listSequences();

      if (autoMode || sequences.length === 0) {
        // In auto mode without an ID, try to match by campaign name
        const matched = sequences.find((s) =>
          s.name.toLowerCase().includes(campaignSlug.toLowerCase())
        );
        if (matched) {
          sequenceId = matched.id;
          sequenceName = matched.name;
          console.log(`✅ Auto-matched sequence: "${sequenceName}"`);
        } else {
          console.warn('⚠️  No matching sequence found. Skipping Apollo metrics pull.');
          sequenceId = '';
          sequenceName = campaignSlug;
        }
      } else {
        // Interactive: show sequence list
        if (process.argv[4]) {
          // Sequence ID passed as 4th arg
          sequenceId = process.argv[4];
          sequenceName = sequences.find((s) => s.id === sequenceId)?.name || campaignSlug;
        } else {
          console.log('\nSequences found:');
          sequences.forEach((s, i) => {
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
      }
    }

    // ─── Pull metrics from Apollo ───
    let metrics: SequenceMetrics | null = null;
    let replies: ApolloReply[] = [];

    if (sequenceId) {
      try {
        metrics = await getSequenceMetrics(sequenceId);
        console.log('\n📊 Apollo Sequence Metrics:');
        console.log(`  Contacts:     ${metrics.contacts_count}`);
        console.log(`  Emails sent:  ${metrics.emails_sent}`);
        console.log(`  Open rate:    ${(metrics.open_rate * 100).toFixed(1)}%`);
        console.log(`  Reply rate:   ${(metrics.reply_rate * 100).toFixed(1)}%`);
        console.log(`  Bounce rate:  ${(metrics.bounce_rate * 100).toFixed(1)}%`);
      } catch (err: any) {
        console.warn(`⚠️  Could not fetch metrics: ${err.message}`);
      }

      try {
        replies = await getSequenceReplies(sequenceId);
        console.log(`💬 Replies pulled: ${replies.length}`);
      } catch (err: any) {
        console.warn(`⚠️  Could not fetch replies: ${err.message}`);
      }
    }

    const emailsSent = metrics?.emails_sent ?? 0;
    const totalReplies = replies.length;
    const openRate = metrics ? (metrics.open_rate * 100).toFixed(1) : '0';

    // ─── Manual inputs (or defaults in auto-mode) ───
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
      console.log('\n📋 Auto-mode: using defaults for qualitative inputs');
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
    }

    // ─── Calculate metrics ───
    const replyRate = emailsSent > 0 ? ((totalReplies / emailsSent) * 100).toFixed(1) : '0';
    const meetingRate = totalReplies > 0 ? ((meetings / totalReplies) * 100).toFixed(1) : '0';
    const closeRate = meetings > 0 ? ((closed / meetings) * 100).toFixed(1) : '0';

    const replySample = replies
      .slice(0, 5)
      .map((r) => `- ${r.contact_name} (${r.contact_email}): "${r.body_text.substring(0, 100)}..."`)
      .join('\n');

    // ─── Write learnings file ───
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

---

Generated: ${new Date().toISOString()}
`;

    const learningsPath = path.join(process.cwd(), 'offers', offerSlug, 'campaigns', campaignSlugArg || campaignSlug, 'results', 'learnings.md');
    fs.mkdirSync(path.dirname(learningsPath), { recursive: true });
    fs.writeFileSync(learningsPath, learningsContent);
    console.log(`\n✅ Learnings saved: ${learningsPath}`);

    // ─── Update what-works.md ───
    const whatWorksPath = path.join(process.cwd(), 'context', 'learnings', 'what-works.md');
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
    console.log(`✅ Updated: ${whatWorksPath}`);

    console.log('\n========================================');
    console.log('✅ SKILL 6 COMPLETE');
    console.log('========================================');
    console.log(`\n  Open rate:    ${openRate}%`);
    console.log(`  Reply rate:   ${replyRate}% (${totalReplies} replies)`);
    console.log(`  Meetings:     ${meetings}`);
    console.log(`  Deals closed: ${closed}`);
    console.log('\n💡 Learnings added to context/learnings/what-works.md');
    console.log('🔄 Flywheel complete! Next campaign will be smarter.');
  } catch (err: any) {
    console.error('❌ Error:', err.message || err);
    if (rl) rl.close();
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // Support: npm run skill:6 -- offer-slug campaign-slug [sequenceId]
  await runSkill6CampaignReview(process.argv[2], process.argv[3]);
}
