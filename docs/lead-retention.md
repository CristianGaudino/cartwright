# Lead retention and erasure

Leads are personal data. Deleting old leads is automatic (see "Automatic purge"). Until the admin area (#20) ships, the owner does the rest by hand (erasure on request, leads that were not emailed) with `npx wrangler d1 execute DB --remote --command "<SQL>"` (or the Cloudflare dashboard, Storage & Databases, D1, the database, Console). Times are stored as epoch milliseconds and `photo_keys` as JSON text.

## How long leads are kept

Leads are kept for **12 months** from when they were sent, then deleted. The period is the constant `LEAD_RETENTION_MONTHS` in `src/lib/leads/constants.ts`, and the `/privacy` page (added in 03-10) states it. The dealer must confirm the period. If it changes, change the constant, `/privacy`, the lifecycle rule's days and this page together.

## Automatic purge

A Cloudflare cron trigger (wrangler.jsonc `triggers`, daily at 03:17 UTC) runs `purgeOldLeads` (src/lib/leads/purge.ts) from `worker.mjs`. It deletes the trade-in photos of every lead older than `LEAD_RETENTION_MONTHS` from R2, then deletes those lead rows. Photos go first: if R2 fails, the rows stay and the next run tries again. Each run logs one line, `{"job":"purge-leads","deleted":<count>}`, and nothing else. A run that throws shows as a failed cron in the Cloudflare dashboard (Workers, the Worker, Cron Triggers) and in Workers Logs.

Check it once after the first deploy, then when Workers Logs show a failed run: Workers Logs should show one `purge-leads` line a day. To run it by hand, or if the cron ever stops, the same deletion as SQL (photos first, see "Erasing one person's photos"):

```sql
DELETE FROM leads WHERE created_at < unixepoch('now', '-12 months') * 1000;
```

## Erasure on request

When someone asks for their data to be deleted, find their rows by the email or phone they give:

```sql
SELECT id, type, datetime(created_at / 1000, 'unixepoch') AS created FROM leads WHERE email = 'their@email.example' OR phone = '083 000 0000';
```

Check the rows are theirs. If any is a trade-in with photos, delete the photos first ("Erasing one person's photos" below). Then delete the rows by id:

```sql
DELETE FROM leads WHERE id IN ('<id>', '<id>');
```

Phone numbers are stored as typed, so try the common spellings (with and without spaces, with `+353`). Delete the dealer's copies of the lead emails too, and reply to say it is done.

## Trade-in photos

Photos sent with a trade-in request are stored in the private R2 bucket `carright-lead-photos` (EU jurisdiction, no public access, no custom domain) under `trade-in/{lead id}/`. The lead row keeps their keys in `photo_keys`. Run the commands below from the repo with a logged-in wrangler (`npx wrangler login`). The flags are for wrangler 4.157; check `--help` if a newer wrangler refuses them.

### Setting up the bucket (once)

```sh
npx wrangler r2 bucket create carright-lead-photos --jurisdiction eu
npx wrangler r2 bucket lifecycle add carright-lead-photos delete-trade-in-photos trade-in/ --expire-days 365 --jurisdiction eu
npx wrangler r2 bucket lifecycle list carright-lead-photos --jurisdiction eu
node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64url'))" | npx wrangler secret put PHOTO_LINK_SECRET
```

The lifecycle rule deletes every object under `trade-in/` 365 days after upload. It is a backstop: the automatic purge already deletes the photos with their lead. The list command must show it. If the rule cannot be set on the EU bucket, the purge still covers every photo that has a lead row.

### Erasing one person's photos

Find their rows as in "Erasure on request", then read the keys before deleting the rows:

```sql
SELECT id, photo_keys FROM leads WHERE id IN ('<id>', '<id>');
```

Delete each key, then the rows:

```sh
npx wrangler r2 object delete "carright-lead-photos/<key>" --jurisdiction eu --remote
```

### Opening a photo after its email link has expired

The links in the dealer email work for 7 days, while the photos are kept for 365 days. To open a photo after that, read the keys with the SQL command above:

```sql
SELECT photo_keys FROM leads WHERE id = '<lead id>';
```

Then download each one:

```sh
npx wrangler r2 object get "carright-lead-photos/<key>" --jurisdiction eu --remote --file photo.jpg
```

The admin inbox (#20) replaces this with fresh links.

## What deletes what

- Lead rows and their photos: the daily purge (`worker.mjs`), once a lead is older than `LEAD_RETENTION_MONTHS` (12 months).
- Trade-in photos with no lead row (an upload whose insert failed and whose cleanup also failed): the R2 lifecycle rule on `trade-in/`, 365 days after upload. If the dealer changes `LEAD_RETENTION_MONTHS`, change the lifecycle rule's days in the same PR.

## Leads that were not emailed

The lead row is the record; the email to the dealer is a notification. If that email fails, the buyer still sees success, the row keeps `notified_at` empty, and the Worker writes one error-level `notify_failed` log line with only the lead id, type and outcome. No contact details are ever logged.

When Workers Logs show a `notify_failed` line, or every morning until #20 ships (an outage of the email service shows up nowhere else), run:

```sql
SELECT id, type, created_at FROM leads WHERE notified_at IS NULL ORDER BY created_at DESC;
```

Open each lead with `SELECT * FROM leads WHERE id = '<id>';` and follow it up by hand. Once handled, mark it so it drops off the list:

```sql
UPDATE leads SET notified_at = unixepoch('now') * 1000 WHERE id = '<id>';
```
