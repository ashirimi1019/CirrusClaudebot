/**
 * Personalization Service
 * Handles placeholder replacement in email/LinkedIn templates
 */

export interface PersonalizationData {
  first_name?: string;
  company_name?: string;
  hiring_signal?: string;
  sender_name?: string;
}

/**
 * Replace placeholders in a template with actual contact/company data.
 * Placeholders: [First Name], [Company Name], [Your Name], [Role], [role], [role plural]
 */
export function personalizeMessage(
  template: string,
  data: PersonalizationData
): string {
  const firstName = data.first_name || 'there';
  const companyName = data.company_name || '';
  const signal = data.hiring_signal || 'engineering talent';
  const senderName = data.sender_name || 'CirrusLabs';

  return template
    .replace(/\[First Name\]/g, firstName)
    .replace(/\[Name\]/g, firstName)
    .replace(/\[Company Name\]/g, companyName)
    .replace(/\[Company\]/g, companyName)
    .replace(/\[Your Name\]/g, senderName)
    .replace(/\[role plural\]/g, signal + 's')
    .replace(/\[roles\]/g, signal + 's')
    .replace(/\[Role\]/g, signal)
    .replace(/\[role\]/g, signal);
}

/**
 * Parse an email variant file (---delimited format) into subject + body.
 */
export function parseEmailVariant(content: string): { subject: string; body: string } {
  const parts = content.split('---');
  let subject = '';
  let body = '';

  if (parts.length >= 2) {
    const middle = parts[1].trim();
    const lines = middle.split('\n');
    for (const line of lines) {
      if (line.startsWith('Subject:')) {
        subject = line.replace('Subject:', '').trim();
        break;
      }
    }
    const blankIdx = middle.indexOf('\n\n');
    body = blankIdx !== -1 ? middle.substring(blankIdx + 2).trim() : middle;
  }

  return {
    subject: subject || 'Email from CirrusLabs',
    body: body || content,
  };
}

/**
 * Parse a markdown variants file (## Variant N headers) into an array.
 */
export function parseVariantsMarkdown(
  content: string
): Array<{ name: string; subject: string; body: string }> {
  const variants: Array<{ name: string; subject: string; body: string }> = [];
  const sections = content.split(/^## /m).filter(Boolean);

  for (const section of sections) {
    const lines = section.split('\n');
    const name = lines[0].trim();
    const subjectLine = lines.find((l) => l.startsWith('**Subject:**'));
    const subject = subjectLine
      ? subjectLine.replace('**Subject:**', '').trim()
      : '';

    const bodyStart = lines.findIndex((l) => l.startsWith('**Body:**'));
    const body =
      bodyStart !== -1
        ? lines
            .slice(bodyStart + 1)
            .join('\n')
            .trim()
        : '';

    if (name && (subject || body)) {
      variants.push({ name, subject, body });
    }
  }

  return variants;
}
