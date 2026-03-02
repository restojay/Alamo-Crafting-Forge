// test/email/fetcher.test.ts
import { describe, it, expect } from 'vitest';
import { extractEmailData } from '../../src/email/gmail/fetcher.js';
import type { gmail_v1 } from 'googleapis';

const mockMessage: gmail_v1.Schema$Message = {
  id: 'msg_test_001',
  threadId: 'thread_test_001',
  labelIds: ['INBOX', 'UNREAD'],
  payload: {
    headers: [
      { name: 'From', value: 'John Doe <john@example.com>' },
      { name: 'To', value: 'jay@alamocraftingforge.com' },
      { name: 'Subject', value: 'Question about ACF Dice custom order' },
      { name: 'Date', value: 'Fri, 28 Feb 2026 10:30:00 -0600' },
    ],
    mimeType: 'text/plain',
    body: {
      data: Buffer.from('Hi, I want to order custom dice for my D&D group. Can you help?').toString('base64url'),
    },
    parts: [],
  },
};

const mockMessageWithParts: gmail_v1.Schema$Message = {
  id: 'msg_test_002',
  threadId: 'thread_test_002',
  labelIds: ['INBOX'],
  payload: {
    headers: [
      { name: 'From', value: 'jane@company.com' },
      { name: 'To', value: 'jay@alamocraftingforge.com' },
      { name: 'Subject', value: 'Bug report for MTG App' },
      { name: 'Date', value: 'Fri, 28 Feb 2026 11:00:00 -0600' },
    ],
    mimeType: 'multipart/alternative',
    body: { size: 0 },
    parts: [
      {
        mimeType: 'text/plain',
        body: {
          data: Buffer.from('The card search is broken when filtering by color.').toString('base64url'),
        },
      },
      {
        mimeType: 'text/html',
        body: {
          data: Buffer.from('<p>The card search is broken when filtering by color.</p>').toString('base64url'),
        },
      },
      {
        mimeType: 'image/png',
        filename: 'screenshot.png',
        body: { attachmentId: 'att_001', size: 50000 },
      },
    ],
  },
};

describe('extractEmailData', () => {
  it('should extract data from a plain text email', () => {
    const result = extractEmailData(mockMessage);

    expect(result.id).toBe('msg_test_001');
    expect(result.threadId).toBe('thread_test_001');
    expect(result.from).toBe('John Doe <john@example.com>');
    expect(result.subject).toBe('Question about ACF Dice custom order');
    expect(result.body).toContain('custom dice');
    expect(result.hasAttachments).toBe(false);
    expect(result.labels).toContain('INBOX');
  });

  it('should extract body from multipart messages', () => {
    const result = extractEmailData(mockMessageWithParts);

    expect(result.id).toBe('msg_test_002');
    expect(result.body).toContain('card search is broken');
    expect(result.hasAttachments).toBe(true);
  });

  it('should handle missing headers gracefully', () => {
    const minimal: gmail_v1.Schema$Message = {
      id: 'msg_minimal',
      threadId: 'thread_minimal',
      payload: {
        headers: [],
        body: { data: Buffer.from('test').toString('base64url') },
      },
    };

    const result = extractEmailData(minimal);
    expect(result.id).toBe('msg_minimal');
    expect(result.from).toBe('');
    expect(result.subject).toBe('');
  });
});
