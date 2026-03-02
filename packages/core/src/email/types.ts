/** Raw email data fetched from Gmail API */
export interface RawEmail {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
  hasAttachments: boolean;
  labels: string[];
}

/** Parsed and enriched email */
export interface ParsedEmail {
  id: string;
  threadId: string;
  from: EmailAddress;
  to: EmailAddress;
  subject: string;
  bodyText: string;
  receivedAt: string;
  hasAttachments: boolean;
  labels: string[];
}

export interface EmailAddress {
  name: string;
  email: string;
}
