import type { RawEmail, ParsedEmail, EmailAddress } from '../types';

function safeParseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

export function parseEmailAddress(raw: string): EmailAddress {
  if (!raw) return { name: '', email: '' };

  const match = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }

  if (raw.includes('@')) {
    return { name: '', email: raw.trim() };
  }

  return { name: raw.trim(), email: '' };
}

export function parseEmail(raw: RawEmail): ParsedEmail {
  return {
    id: raw.id,
    threadId: raw.threadId,
    from: parseEmailAddress(raw.from),
    to: parseEmailAddress(raw.to),
    subject: raw.subject,
    bodyText: raw.body.trim(),
    receivedAt: safeParseDate(raw.date),
    hasAttachments: raw.hasAttachments,
    labels: raw.labels,
  };
}
