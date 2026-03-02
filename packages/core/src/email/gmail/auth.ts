// src/email/gmail/auth.ts
import { google } from 'googleapis';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createServer } from 'http';
import { URL } from 'url';
import { randomBytes } from 'crypto';

export interface GmailAuthOptions {
  /** Path to the OAuth2 credentials.json file */
  credentialsPath: string;
  /** Path to store/read the OAuth2 token.json file */
  tokenPath: string;
  /** OAuth2 scopes (defaults to gmail.readonly) */
  scopes?: string[];
  /** OAuth2 redirect URI (defaults to http://localhost:3000) */
  redirectUri?: string;
}

const DEFAULT_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const DEFAULT_REDIRECT_URI = 'http://localhost:3000';

function loadCredentials(credentialsPath: string) {
  const content = readFileSync(credentialsPath, 'utf-8');
  return JSON.parse(content).installed;
}

export function getAuthClient(options: GmailAuthOptions) {
  const { credentialsPath, tokenPath, redirectUri = DEFAULT_REDIRECT_URI } = options;

  const creds = loadCredentials(credentialsPath);
  const oauth2Client = new google.auth.OAuth2(
    creds.client_id,
    creds.client_secret,
    redirectUri
  );

  if (existsSync(tokenPath)) {
    const tokens = JSON.parse(readFileSync(tokenPath, 'utf-8'));
    oauth2Client.setCredentials(tokens);
  }

  return oauth2Client;
}

export function hasValidToken(tokenPath: string): boolean {
  if (!existsSync(tokenPath)) return false;
  try {
    const tokens = JSON.parse(readFileSync(tokenPath, 'utf-8'));
    // googleapis handles refresh automatically if refresh_token exists
    return !!tokens.refresh_token || !!tokens.access_token;
  } catch {
    return false;
  }
}

export async function authenticate(options: GmailAuthOptions): Promise<void> {
  const {
    credentialsPath,
    tokenPath,
    scopes = DEFAULT_SCOPES,
    redirectUri = DEFAULT_REDIRECT_URI,
  } = options;

  const creds = loadCredentials(credentialsPath);
  const oauth2Client = new google.auth.OAuth2(
    creds.client_id,
    creds.client_secret,
    redirectUri
  );

  const state = randomBytes(16).toString('hex');

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    state,
  });

  console.log('\n=== ServiceBot Gmail Authorization ===\n');
  console.log('Opening browser for authorization...\n');
  console.log(authUrl);
  console.log(`\nWaiting for authorization callback on ${redirectUri}...\n`);

  // Auto-open browser
  const { exec } = await import('child_process');
  exec(`start chrome "${authUrl}"`);

  const port = new URL(redirectUri).port || '3000';

  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url!, redirectUri);

        const returnedState = url.searchParams.get('state');
        if (returnedState !== state) {
          res.writeHead(403);
          res.end('Invalid state parameter — possible CSRF attack.');
          return;
        }

        const code = url.searchParams.get('code');

        if (!code) {
          res.writeHead(400);
          res.end('No authorization code received.');
          return;
        }

        const { tokens } = await oauth2Client.getToken(code);
        writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>ServiceBot authorized successfully!</h1><p>You can close this tab.</p>');

        console.log(`Token saved to ${tokenPath}`);
        server.close();
        resolve();
      } catch (err) {
        res.writeHead(500);
        res.end('Authorization failed.');
        server.close();
        reject(err);
      }
    });

    server.listen(parseInt(port, 10), () => {
      console.log(`Callback server listening on port ${port}...`);
    });
  });
}
