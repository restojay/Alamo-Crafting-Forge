// src/email/gmail/client.ts
import { google, gmail_v1 } from 'googleapis';
import { getAuthClient, type GmailAuthOptions } from './auth';

let gmailInstance: gmail_v1.Gmail | null = null;
let currentOptions: GmailAuthOptions | null = null;

export function getGmailClient(options: GmailAuthOptions): gmail_v1.Gmail {
  // Re-create if options changed or not yet initialized
  if (!gmailInstance || JSON.stringify(options) !== JSON.stringify(currentOptions)) {
    const auth = getAuthClient(options);
    gmailInstance = google.gmail({ version: 'v1', auth });
    currentOptions = options;
  }
  return gmailInstance;
}

/** Reset the singleton (useful for testing) */
export function resetGmailClient(): void {
  gmailInstance = null;
  currentOptions = null;
}
