/*
# Add due_date column, enforce user_id NOT NULL, remove demo data, tighten RLS

1. Schema Changes
- Add `due_date date` column to `invoices` (nullable for backwards compat).
- Alter `user_id` on invoices, business_settings, and activity_log to NOT NULL DEFAULT auth.uid().
  Existing rows with NULL user_id need to be handled: we delete all demo seed data first,
  then make the column NOT NULL.

2. Data Changes
- DELETE all existing rows from invoices, business_settings, and activity_log that have user_id IS NULL
  (these are the demo seed rows). This removes all demo data so users start with a clean dashboard.
- DELETE all rows from all three tables to start completely fresh (no demo data for anyone).

3. Security Changes
- Tighten RLS SELECT policies: remove the `OR user_id IS NULL` fallback.
  Users now only see rows where auth.uid() = user_id (strictly own data).
- Update policy for business_settings also tightened to only allow updating own rows.

4. Notes
- New inserts get user_id from the auth session via DEFAULT auth.uid().
- days_overdue is now computed from due_date in the application layer.
*/

-- Add due_date column to invoices
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'due_date') THEN
    ALTER TABLE invoices ADD COLUMN due_date date;
  END IF;
END $$;

-- Remove all demo/seed data (rows with NULL user_id, plus everything else for a clean slate)
DELETE FROM invoices WHERE user_id IS NULL;
DELETE FROM business_settings WHERE user_id IS NULL;
DELETE FROM activity_log WHERE user_id IS NULL;

-- Now make user_id NOT NULL with DEFAULT auth.uid() on all three tables
ALTER TABLE invoices ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE invoices ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE business_settings ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE business_settings ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE activity_log ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE activity_log ALTER COLUMN user_id SET NOT NULL;

-- Tighten RLS: remove the user_id IS NULL fallback from SELECT policies
DROP POLICY IF EXISTS "auth_select_invoices" ON invoices;
CREATE POLICY "auth_select_invoices" ON invoices FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_insert_invoices" ON invoices;
CREATE POLICY "auth_insert_invoices" ON invoices FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_update_invoices" ON invoices;
CREATE POLICY "auth_update_invoices" ON invoices FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_delete_invoices" ON invoices;
CREATE POLICY "auth_delete_invoices" ON invoices FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- business_settings
DROP POLICY IF EXISTS "auth_select_settings" ON business_settings;
CREATE POLICY "auth_select_settings" ON business_settings FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_insert_settings" ON business_settings;
CREATE POLICY "auth_insert_settings" ON business_settings FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_update_settings" ON business_settings;
CREATE POLICY "auth_update_settings" ON business_settings FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_delete_settings" ON business_settings;
CREATE POLICY "auth_delete_settings" ON business_settings FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- activity_log
DROP POLICY IF EXISTS "auth_select_activity" ON activity_log;
CREATE POLICY "auth_select_activity" ON activity_log FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_insert_activity" ON activity_log;
CREATE POLICY "auth_insert_activity" ON activity_log FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_update_activity" ON activity_log;
CREATE POLICY "auth_update_activity" ON activity_log FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "auth_delete_activity" ON activity_log;
CREATE POLICY "auth_delete_activity" ON activity_log FOR DELETE
TO authenticated USING (auth.uid() = user_id);
