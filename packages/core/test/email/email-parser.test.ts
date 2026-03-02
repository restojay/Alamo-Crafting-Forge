import { describe, it, expect } from 'vitest';
import { parseEmail, parseEmailAddress } from '../../src/email/parser/email-parser.js';
import type { RawEmail } from '../../src/email/types.js';

describe('parseEmailAddress', () => {
  it('should parse "Name <email>" format', () => {
    const result = parseEmailAddress('John Doe <john@example.com>');
    expect(result.name).toBe('John Doe');
    expect(result.email).toBe('john@example.com');
  });

  it('should parse bare email address', () => {
    const result = parseEmailAddress('john@example.com');
    expect(result.name).toBe('');
    expect(result.email).toBe('john@example.com');
  });

  it('should handle empty string', () => {
    const result = parseEmailAddress('');
    expect(result.name).toBe('');
    expect(result.email).toBe('');
  });
});

describe('parseEmail', () => {
  it('should convert RawEmail to ParsedEmail', () => {
    const raw: RawEmail = {
      id: 'msg_001',
      threadId: 'thread_001',
      from: 'John Doe <john@example.com>',
      to: 'jay@alamocraftingforge.com',
      subject: 'Help with my dice order',
      body: 'I ordered custom dice last week and haven\'t received tracking.',
      date: 'Fri, 28 Feb 2026 10:30:00 -0600',
      hasAttachments: false,
      labels: ['INBOX', 'UNREAD'],
    };

    const parsed = parseEmail(raw);

    expect(parsed.id).toBe('msg_001');
    expect(parsed.from.name).toBe('John Doe');
    expect(parsed.from.email).toBe('john@example.com');
    expect(parsed.to.email).toBe('jay@alamocraftingforge.com');
    expect(parsed.subject).toBe('Help with my dice order');
    expect(parsed.bodyText).toContain('tracking');
    expect(parsed.receivedAt).toBeDefined();
    expect(parsed.hasAttachments).toBe(false);
  });

  it('should handle malformed date strings without crashing', () => {
    const raw: RawEmail = {
      id: 'msg_bad_date',
      threadId: 'thread_bad',
      from: 'test@test.com',
      to: 'jay@test.com',
      subject: 'Bad date',
      body: 'test',
      date: 'not-a-real-date-string',
      hasAttachments: false,
      labels: ['INBOX'],
    };
    const parsed = parseEmail(raw);
    expect(parsed.receivedAt).toBeDefined();
    expect(() => new Date(parsed.receivedAt)).not.toThrow();
  });
});
