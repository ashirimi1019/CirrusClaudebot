/**
 * One-time fix script: Populate blank Apollo sequence templates with real email variant content.
 *
 * Template IDs (from sequence 69b1566c0a8cd200119c1996):
 *   Step 1 → 69b1566ca4d4600019cfaab7  (has test content, needs real variant 1)
 *   Step 2 → 69b1566cffa1650011665c83  (blank)
 *   Step 3 → 69b1566da4d4600019cfaabc  (blank)
 *
 * Usage: npx tsx scripts/fix-blank-templates.ts
 */

import 'dotenv/config';
import { updateEmailTemplate, getSequenceDetails } from '../src/lib/clients/apollo.ts';

const SEQUENCE_ID = '69b1566c0a8cd200119c1996';

const templates = [
  {
    id: '69b1566ca4d4600019cfaab7',
    subject: '{{company}} Hiring {{title}}?',
    body: `Hi {{first_name}},

I saw {{company}} is hiring for {{title}} and wanted to reach out. Finding qualified engineers typically takes companies 3-4 months, but we consistently reduce this to 3-4 weeks.

At CirrusLabs, we specialize in placing engineers for companies like yours. Just last quarter, we successfully filled 4 similar roles for Series B/C companies within your industry, ensuring they met their growth targets without delay.

Does Tuesday at 2pm or Thursday at 10am work for a brief 15-minute chat to explore how we can expedite your hiring process?

Best,
Ashir`,
  },
  {
    id: '69b1566cffa1650011665c83',
    subject: '{{company}} Hiring {{title}} Soon?',
    body: `Hi {{first_name}},

I saw {{company}} is hiring for {{title}}. Finding top talent in this area often takes companies 3-4 months. We typically achieve this in just 3-4 weeks.

We specialize in placing engineers for growing companies like yours. Last quarter, we successfully filled similar positions at Series B/C companies, ensuring they had the right talent at the right time.

Does Tuesday at 2pm or Thursday at 10am work for a quick 15-minute call to discuss your hiring plans?

Best,
Ashir`,
  },
  {
    id: '69b1566da4d4600019cfaabc',
    subject: '{{company}} Hiring {{title}}? Let\'s Accelerate the Process',
    body: `Hi {{first_name}},

I saw {{company}} is currently hiring for {{title}}. Finding skilled engineers typically takes most organizations 3-4 months. We consistently reduce this timeline to just 3-4 weeks.

Our expertise lies in placing engineers at companies like yours. Last quarter alone, we successfully filled 4 similar positions at Series B/C companies in your industry. This efficiency ensures your team scales quickly without bottlenecks.

Does Tuesday at 2pm or Thursday at 10am work for a quick 15-minute call to explore how we can assist your hiring process?

Looking forward to the conversation.

Best,
Ashir`,
  },
];

async function main() {
  console.log('🔧 Fixing blank Apollo templates...\n');

  for (let i = 0; i < templates.length; i++) {
    const t = templates[i];
    console.log(`  Step ${i + 1}: Updating template ${t.id}`);
    console.log(`    Subject: "${t.subject}"`);

    try {
      await updateEmailTemplate(t.id, t.subject, t.body);
      console.log(`    ✅ Template ${i + 1} updated successfully\n`);
    } catch (err: any) {
      console.error(`    ❌ Template ${i + 1} FAILED: ${err.response?.data?.message || err.message}\n`);
    }
  }

  // Verify all templates are now populated
  console.log('📋 Verifying sequence templates...\n');
  const details = await getSequenceDetails(SEQUENCE_ID);

  for (const tmpl of details.templates) {
    const hasContent = tmpl.subject && tmpl.body_text.trim().length > 0;
    const status = hasContent ? '✅' : '❌';
    console.log(`  ${status} Template ${tmpl.id}:`);
    console.log(`     Subject: ${tmpl.subject || '(blank)'}`);
    console.log(`     Body length: ${tmpl.body_text.length} chars`);
  }

  // Also show touch statuses
  console.log('\n📊 Touch statuses:');
  for (const touch of details.touches) {
    console.log(`  Touch ${touch.id}: status="${touch.status}" → template=${touch.emailer_template_id}`);
  }

  console.log('\n✅ Done.');
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
