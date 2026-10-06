/*
# Create settings and activity_log tables for CollectAI dashboard

1. New Tables
- `business_settings`
  - `id` (uuid, primary key)
  - `company_name` (text, not null) — the user's company name
  - `email` (text, not null) — contact email for the business
  - `ai_tone` (text, not null) — preferred AI follow-up tone: 'friendly' or 'firm'
  - `updated_at` (timestamptz, default now())
- `activity_log`
  - `id` (uuid, primary key)
  - `message` (text, not null) — human-readable description of the activity
  - `icon_type` (text, not null default 'send') — hint for which icon to display
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on both tables.
- Single-tenant app (no sign-in): allow anon + authenticated full CRUD.

3. Seed Data
- Inserts a default settings row (CollectAI Demo, demo@collectai.com, friendly).
- Inserts sample activity log entries referencing existing seed invoices.
*/

CREATE TABLE IF NOT EXISTS business_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'CollectAI Demo',
  email text NOT NULL DEFAULT 'demo@collectai.com',
  ai_tone text NOT NULL DEFAULT 'friendly',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_settings" ON business_settings;
CREATE POLICY "anon_select_settings" ON business_settings FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_settings" ON business_settings;
CREATE POLICY "anon_insert_settings" ON business_settings FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_settings" ON business_settings;
CREATE POLICY "anon_update_settings" ON business_settings FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_settings" ON business_settings;
CREATE POLICY "anon_delete_settings" ON business_settings FOR DELETE
TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  icon_type text NOT NULL DEFAULT 'send',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_activity" ON activity_log;
CREATE POLICY "anon_select_activity" ON activity_log FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_activity" ON activity_log;
CREATE POLICY "anon_insert_activity" ON activity_log FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_activity" ON activity_log;
CREATE POLICY "anon_update_activity" ON activity_log FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_activity" ON activity_log;
CREATE POLICY "anon_delete_activity" ON activity_log FOR DELETE
TO anon, authenticated USING (true);

-- Seed default settings row (only if table is empty)
INSERT INTO business_settings (company_name, email, ai_tone)
SELECT 'CollectAI Demo', 'demo@collectai.com', 'friendly'
WHERE NOT EXISTS (SELECT 1 FROM business_settings);

-- Seed sample activity log entries (only if table is empty)
INSERT INTO activity_log (message, icon_type, created_at)
SELECT * FROM (VALUES
  ('Reminder sent to Hooli Inc', 'send', now() - interval '2 hours'),
  ('Reminder sent to Stark Industries', 'send', now() - interval '5 hours'),
  ('Invoice escalated for Acme Corp', 'alert', now() - interval '1 day'),
  ('Reminder sent to Initech LLC', 'send', now() - interval '1 day'),
  ('Payment received from Wayne Enterprises', 'check', now() - interval '2 days'),
  ('Reminder sent to Umbrella Corp', 'send', now() - interval '3 days')
) AS t(message, icon_type, created_at)
WHERE NOT EXISTS (SELECT 1 FROM activity_log);
