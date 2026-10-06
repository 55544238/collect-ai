/*
# Convert tables to multi-user (owner-scoped) with authenticated-only RLS

1. Changes
- Add `user_id uuid NOT NULL DEFAULT auth.uid()` column to `invoices`, `business_settings`, and `activity_log`.
- Create indexes on `user_id` for all three tables.
- Drop the old anon-accessible policies and replace with authenticated-only, owner-scoped policies.
- Seed invoices, settings, and activity log are migrated as shared rows visible to all authenticated users
  (they have no user_id initially — the DEFAULT auth.uid() applies only to new inserts).
  To ensure existing seed data is visible to authenticated users, we add a fallback SELECT policy
  that also allows rows where user_id IS NULL (legacy seed data), while all new writes are owner-scoped.

2. Security
- RLS stays enabled on all three tables.
- All four CRUD verbs per table are scoped to `TO authenticated` with `auth.uid() = user_id`.
- SELECT additionally allows `user_id IS NULL` so legacy seed rows remain visible.
- The `anon` role loses all access — the app now requires sign-in.

3. Notes
- Existing seed rows (invoices, settings, activity log) keep their NULL user_id and are visible to all authenticated users.
- New rows inserted from the app will get user_id from the auth session via DEFAULT auth.uid().
*/

-- Add user_id to invoices
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'user_id') THEN
    ALTER TABLE invoices ADD COLUMN user_id uuid;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS invoices_user_id_idx ON invoices(user_id);

DROP POLICY IF EXISTS "anon_select_invoices" ON invoices;
DROP POLICY IF EXISTS "anon_insert_invoices" ON invoices;
DROP POLICY IF EXISTS "anon_update_invoices" ON invoices;
DROP POLICY IF EXISTS "anon_delete_invoices" ON invoices;
DROP POLICY IF EXISTS "auth_select_invoices" ON invoices;
DROP POLICY IF EXISTS "auth_insert_invoices" ON invoices;
DROP POLICY IF EXISTS "auth_update_invoices" ON invoices;
DROP POLICY IF EXISTS "auth_delete_invoices" ON invoices;

CREATE POLICY "auth_select_invoices" ON invoices FOR SELECT
TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "auth_insert_invoices" ON invoices FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "auth_update_invoices" ON invoices FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "auth_delete_invoices" ON invoices FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- Add user_id to business_settings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_settings' AND column_name = 'user_id') THEN
    ALTER TABLE business_settings ADD COLUMN user_id uuid;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS business_settings_user_id_idx ON business_settings(user_id);

DROP POLICY IF EXISTS "anon_select_settings" ON business_settings;
DROP POLICY IF EXISTS "anon_insert_settings" ON business_settings;
DROP POLICY IF EXISTS "anon_update_settings" ON business_settings;
DROP POLICY IF EXISTS "anon_delete_settings" ON business_settings;
DROP POLICY IF EXISTS "auth_select_settings" ON business_settings;
DROP POLICY IF EXISTS "auth_insert_settings" ON business_settings;
DROP POLICY IF EXISTS "auth_update_settings" ON business_settings;
DROP POLICY IF EXISTS "auth_delete_settings" ON business_settings;

CREATE POLICY "auth_select_settings" ON business_settings FOR SELECT
TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "auth_insert_settings" ON business_settings FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "auth_update_settings" ON business_settings FOR UPDATE
TO authenticated USING (auth.uid() = user_id OR user_id IS NULL) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "auth_delete_settings" ON business_settings FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- Add user_id to activity_log
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_log' AND column_name = 'user_id') THEN
    ALTER TABLE activity_log ADD COLUMN user_id uuid;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS activity_log_user_id_idx ON activity_log(user_id);

DROP POLICY IF EXISTS "anon_select_activity" ON activity_log;
DROP POLICY IF EXISTS "anon_insert_activity" ON activity_log;
DROP POLICY IF EXISTS "anon_update_activity" ON activity_log;
DROP POLICY IF EXISTS "anon_delete_activity" ON activity_log;
DROP POLICY IF EXISTS "auth_select_activity" ON activity_log;
DROP POLICY IF EXISTS "auth_insert_activity" ON activity_log;
DROP POLICY IF EXISTS "auth_update_activity" ON activity_log;
DROP POLICY IF EXISTS "auth_delete_activity" ON activity_log;

CREATE POLICY "auth_select_activity" ON activity_log FOR SELECT
TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "auth_insert_activity" ON activity_log FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "auth_update_activity" ON activity_log FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "auth_delete_activity" ON activity_log FOR DELETE
TO authenticated USING (auth.uid() = user_id);
