import axios from 'axios';
import fs from 'fs';
import path from 'path';

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
}

export interface GeneratedDraft {
  subject: string;
  body: string;
}

export async function generateDraft(input: DraftGenerationInput): Promise<GeneratedDraft> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');

  const prompt = await buildPrompt(input);

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert B2B outreach copywriter for staffing/talent acquisition. You write emails that convert. Follow the principles provided and generate compelling, personalized emails that reference specific signals. Your emails are professional, direct, and honest—never generic filler.',
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
      }
    );

    const content = response.data.choices[0].message.content;
    const [subjectLine, ...bodyLines] = content.split('\n');

    return {
      subject: subjectLine.replace('Subject: ', '').trim(),
      body: bodyLines.join('\n').trim(),
    };
  } catch (error: any) {
    throw new Error(`OpenAI API error: ${error.message}`);
  }
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

Now generate an outreach email for:
- Company: ${companyName}
- Recipient: ${buyerFirstName} (${buyerTitle})
- Signal/Evidence: ${signal}
${jobUrl ? `- Job URL: ${jobUrl}` : ''}

Output format:
Subject: [compelling subject line]
[Email body - 100-150 words, reference the signal directly, no generic filler]`;
}
