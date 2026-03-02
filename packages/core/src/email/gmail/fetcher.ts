// src/email/gmail/fetcher.ts
import type { gmail_v1 } from 'googleapis';
import { getGmailClient } from './client';
import type { GmailAuthOptions } from './auth';
import type { RawEmail } from '../types';

export function extractEmailData(message: gmail_v1.Schema$Message): RawEmail {
  const headers = message.payload?.headers ?? [];
  const getHeader = (name: string): string =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';

  const body = extractBody(message.payload ?? {});
  const hasAttachments = checkAttachments(message.payload?.parts ?? []);

  return {
    id: message.id ?? '',
    threadId: message.threadId ?? '',
    from: getHeader('From'),
    to: getHeader('To'),
    subject: getHeader('Subject'),
    body,
    date: getHeader('Date'),
    hasAttachments,
    labels: message.labelIds ?? [],
  };
}

function extractBody(payload: gmail_v1.Schema$MessagePart): string {
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64url').toString('utf-8');
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        const html = Buffer.from(part.body.data, 'base64url').toString('utf-8');
        return html.replace(/<[^>]+>/g, '');
      }
    }
  }

  return '';
}

function checkAttachments(parts: gmail_v1.Schema$MessagePart[]): boolean {
  return parts.some((p) => p.filename && p.filename.length > 0);
}

export async function fetchNewMessages(
  authOptions: GmailAuthOptions,
  maxResults = 10
): Promise<RawEmail[]> {
  const gmail = getGmailClient(authOptions);

  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    q: 'is:inbox',
  });

  const messageIds = response.data.messages ?? [];

  const emails = await Promise.all(
    messageIds
      .filter((msg) => msg.id)
      .map(async (msg) => {
        const full = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'full',
        });
        return extractEmailData(full.data);
      })
  );

  return emails;
}
