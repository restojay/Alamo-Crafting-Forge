# ServiceBot Phase 2 — Operations Runbook

## Required Environment Variables

| Variable | Purpose | Example |
|-|-|-|
| `SERVICEBOT_DB_PATH` | SQLite database file path | `./data/servicebot.db` |
| `GMAIL_CLIENT_ID` | Gmail OAuth client ID | (from Google Cloud Console) |
| `GMAIL_CLIENT_SECRET` | Gmail OAuth client secret | (from Google Cloud Console) |
| `GMAIL_REFRESH_TOKEN` | Gmail OAuth refresh token | (per subsidiary) |
| `SMTP_PASS` | SMTP password (per subsidiary via `passwordEnv`) | (from SMTP provider) |
| Webhook secrets | HMAC signing keys (per subsidiary via `secretEnv`) | (random 32+ char string) |

## Dashboard Access

Admin dashboard: `/admin/servicebot`

- **Tickets**: `/admin/servicebot/tickets` — view all open tickets
- **Tasks**: `/admin/servicebot/tasks` — view tasks by ticket
- **Drafts**: `/admin/servicebot/drafts` — review and approve/reject drafts

## Draft Approval Process

1. Navigate to Drafts page
2. Enter ticket ID and customer email
3. Review the AI-generated draft response
4. Click **Approve** to send, or **Reject** with a reason

Approved drafts are sent via SMTP. Rejected drafts are logged with reason.
No draft is ever sent without human approval.

## Webhook Retry Queue

Failed webhook deliveries are automatically retried with exponential backoff:
- Attempt 1: immediate
- Attempt 2: +1s
- Attempt 3: +2s
- Attempt 4: +4s
- Attempt 5: +8s (max 5 attempts)

To check pending retries, query the `webhook_attempts` table:
```sql
SELECT * FROM webhook_attempts WHERE status = 'pending' ORDER BY next_retry_at;
```

## Client Onboarding

Register a new client via API:
```bash
curl -X POST /api/admin/servicebot/onboarding \
  -H "Content-Type: application/json" \
  -d '{"config": { ... }}'
```

Registration is idempotent — duplicate registrations return `created: false`.

## Health Check

```bash
curl /api/health
```

Returns: `{"status": "ok", "time": "...", "servicebot": {"version": "0.2.0", "phase": 2}}`

## Failure Recovery

### Email Processing Stuck
1. Check `processed_emails` table for the email ID
2. If stuck, delete the row to allow reprocessing
3. Service runner will pick it up on next poll cycle

### Draft Sent But No Confirmation
1. Check `drafts` table: `sent_at` should be set
2. Check `audit_log` for the `draft:sent` action
3. Verify SMTP provider delivery logs

### Webhook Not Delivered
1. Check `webhook_attempts` table for the event
2. If all 5 attempts failed, manually replay:
   - Update the failed row: `UPDATE webhook_attempts SET status = 'pending', attempt = 1, next_retry_at = datetime('now') WHERE id = '...'`
