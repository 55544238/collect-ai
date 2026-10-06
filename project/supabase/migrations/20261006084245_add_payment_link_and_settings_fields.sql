/*
# Add payment_link, business_address, and email_signature columns

1. Schema Changes
- Add `payment_link text` column to `invoices` (nullable) — optional URL for online payment.
- Add `business_address text` column to `business_settings` (nullable) — business mailing address.
- Add `email_signature text` column to `business_settings` (nullable) — custom email sign-off.

2. Security
- No policy changes. Existing RLS policies already cover the new columns since they are
  on the same tables with the same owner-scoped access.

3. Notes
- All three columns are optional (nullable) so existing rows and new inserts work without them.
- payment_link is only displayed in the AI email draft when non-empty.
- business_address and email_signature appear at the bottom of generated emails when set.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'payment_link') THEN
    ALTER TABLE invoices ADD COLUMN payment_link text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'business_address') THEN
    ALTER TABLE business_settings ADD COLUMN business_address text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'email_signature') THEN
    ALTER TABLE business_settings ADD COLUMN email_signature text;
  END IF;
END $$;
