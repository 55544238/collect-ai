/*
# Add tracking dates for reminders and payment

1. Schema Changes
- Add `paid_at timestamptz` to `invoices` — set when an invoice is marked Paid.
- Add `first_reminder_at timestamptz` to `invoices` — set when the first reminder is sent.
- Add `second_reminder_at timestamptz` to `invoices` — set when the second reminder is sent.

2. Security
- No policy changes. Existing RLS policies already cover the new columns.

3. Notes
- All three columns are nullable so existing rows remain valid.
- "Money Recovered" will now count only invoices where paid_at is non-null
  AND at least one of first_reminder_at / second_reminder_at is non-null
  (i.e., payment happened after at least one reminder was sent).
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'paid_at') THEN
    ALTER TABLE invoices ADD COLUMN paid_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'first_reminder_at') THEN
    ALTER TABLE invoices ADD COLUMN first_reminder_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'second_reminder_at') THEN
    ALTER TABLE invoices ADD COLUMN second_reminder_at timestamptz;
  END IF;
END $$;
