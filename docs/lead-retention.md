# Lead retention and erasure

Leads are personal data. Until the admin area (#20) ships, the owner keeps the promises below by hand in the Neon SQL editor (Neon console, the project, SQL Editor, branch `main`).

## How long leads are kept

Leads are kept for **12 months** from when they were sent, then deleted. The period is the constant `LEAD_RETENTION_MONTHS` in `src/lib/leads/schema.ts`, and the `/privacy` page (added in 03-10) states it. The dealer must confirm the period. If it changes, change the constant, `/privacy`, the purge statement below and this page together.

## Monthly purge

Once a month, run:

```sql
DELETE FROM leads WHERE created_at < now() - interval '12 months';
```

The editor shows how many rows it deleted. An automatic deletion job is deferred to the admin phase (#20).

## Erasure on request

When someone asks for their data to be deleted, find their rows by the email or phone they give:

```sql
SELECT id, type, created_at FROM leads WHERE email = 'their@email.example' OR phone = '083 000 0000';
```

Check the rows are theirs, then delete them by id:

```sql
DELETE FROM leads WHERE id IN ('<id>', '<id>');
```

Phone numbers are stored as typed, so try the common spellings (with and without spaces, with `+353`). Delete the dealer's copies of the lead emails too, and reply to say it is done.

## Leads that were not emailed

The lead row is the record; the email to the dealer is a notification. If that email fails, the buyer still sees success, the row keeps `notified_at` empty, and the Worker writes one error-level `notify_failed` log line with only the lead id, type and outcome. No contact details are ever logged.

When Workers Logs show a `notify_failed` line, or once a week until #20 ships, run:

```sql
SELECT id, type, created_at FROM leads WHERE notified_at IS NULL ORDER BY created_at DESC;
```

Open each lead with `SELECT * FROM leads WHERE id = '<id>';` and follow it up by hand. Once handled, mark it so it drops off the list:

```sql
UPDATE leads SET notified_at = now() WHERE id = '<id>';
```
