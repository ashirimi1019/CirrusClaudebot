/**
 * seed-context.ts
 * Validates that all required context files exist and are non-empty.
 * Run: npx ts-node --esm src/scripts/seed-context.ts
 */

import fs from 'fs';
import path from 'path';

const CONTEXT_ROOT = path.join(process.cwd(), 'context');

const REQUIRED_FILES: Array<{ path: string; description: string }> = [
  // Frameworks
  { path: 'frameworks/icp-framework.md', description: 'ICP definition and scoring rules' },
  { path: 'frameworks/signal-generation.md', description: 'Signal types and detection methods' },
  { path: 'frameworks/signal-generation-guide.md', description: 'Signal-to-Apollo query mapping' },
  { path: 'frameworks/signal-brainstorming-template.md', description: 'Template for new campaign signals' },
  { path: 'frameworks/positioning-canvas.md', description: '13-section positioning template' },
  { path: 'frameworks/contact-finding-guide.md', description: 'Decision-maker discovery strategy' },
  { path: 'frameworks/api-routing-guide.md', description: 'API selection and cost optimization' },

  // API Guides
  { path: 'api-guides/apollo-capabilities-guide.md', description: 'Apollo feature overview' },
  { path: 'api-guides/apollo-api-guide.md', description: 'Apollo API endpoints and parameters' },
  { path: 'api-guides/openai-api-guide.md', description: 'OpenAI copy generation guide' },
  { path: 'api-guides/supabase-guide.md', description: 'Supabase database guide' },

  // Copywriting
  { path: 'copywriting/email-principles.md', description: 'Email subject lines, body, CTA rules' },
  { path: 'copywriting/linkedin-principles.md', description: 'LinkedIn DM strategy and safety' },

  // Principles
  { path: 'principles/permissionless-value.md', description: 'Value-first outreach principle' },
  { path: 'principles/use-case-driven.md', description: 'Use-case specific messaging' },
  { path: 'principles/mistakes-to-avoid.md', description: 'Common outreach mistakes' },

  // Learnings
  { path: 'learnings/what-works.md', description: 'Campaign results and winning patterns (grows over time)' },
];

interface FileStatus {
  file: string;
  description: string;
  exists: boolean;
  empty: boolean;
  size: number;
}

function checkContextFiles(): FileStatus[] {
  return REQUIRED_FILES.map(({ path: filePath, description }) => {
    const fullPath = path.join(CONTEXT_ROOT, filePath);
    const exists = fs.existsSync(fullPath);
    let empty = true;
    let size = 0;

    if (exists) {
      const content = fs.readFileSync(fullPath, 'utf-8').trim();
      empty = content.length === 0;
      size = content.length;
    }

    return { file: filePath, description, exists, empty, size };
  });
}

function main() {
  console.log('\n========================================');
  console.log('Context File Validator');
  console.log('========================================\n');

  const statuses = checkContextFiles();

  let missingCount = 0;
  let emptyCount = 0;
  let okCount = 0;

  for (const s of statuses) {
    if (!s.exists) {
      console.log(`  ❌ MISSING  ${s.file}`);
      console.log(`              → ${s.description}`);
      missingCount++;
    } else if (s.empty) {
      console.log(`  ⚠️  EMPTY    ${s.file}`);
      console.log(`              → ${s.description}`);
      emptyCount++;
    } else {
      console.log(`  ✅ OK       ${s.file} (${s.size} chars)`);
      okCount++;
    }
  }

  console.log('\n========================================');
  console.log(`Results: ${okCount} OK | ${emptyCount} empty | ${missingCount} missing`);
  console.log('========================================\n');

  if (missingCount > 0 || emptyCount > 0) {
    console.log('⚠️  Some context files need attention.');
    console.log('   The system will still work, but quality may be reduced.');
    console.log('   Fill in missing/empty files before running campaigns.\n');
    process.exit(1);
  } else {
    console.log('✅ All context files present and non-empty. System is ready.\n');
  }
}

main();
