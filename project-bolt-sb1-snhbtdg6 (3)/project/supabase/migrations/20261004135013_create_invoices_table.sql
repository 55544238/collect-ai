/*
# Create invoices table for CollectAI dashboard (single-tenant, no auth)

1. New Tables
- `invoices`
  - `id` (uuid, primary key)
  - `client_name` (text, not null) — name of the client who owes the invoice
  - `client_email` (text, not null) — email address for follow-up reminders
  - `invoice_number` (text, not null) — human-readable invoice ID
  - `amount` (numeric, not null) — outstanding invoice amount in dollars
  - `days_overdue` (integer, not null) — number of days past the due date
  - `follow_up_status` (text, not null) — current follow-up state: 'Pending', 'Reminder 1 Sent', 'Reminder 2 Sent', 'Escalated', 'Paid'
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `invoices`.
- Single-tenant app (no sign-in): allow anon + authenticated full CRUD so the dashboard can read and update invoices.

3. Seed Data
- Inserts 8 sample invoices with varied clients, amounts, overdue days, and follow-up statuses.
*/

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  client_email text NOT NULL,
  invoice_number text NOT NULL,
  amount numeric(10, 2) NOT NULL,
  days_overdue integer NOT NULL DEFAULT 0,
  follow_up_status text NOT NULL DEFAULT 'Pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_invoices" ON invoices;
CREATE POLICY "anon_select_invoices" ON invoices FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_invoices" ON invoices;
CREATE POLICY "anon_insert_invoices" ON invoices FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_invoices" ON invoices;
CREATE POLICY "anon_update_invoices" ON invoices FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_invoices" ON invoices;
CREATE POLICY "anon_delete_invoices" ON invoices FOR DELETE
TO anon, authenticated USING (true);

-- Seed data (only if table is empty)
INSERT INTO invoices (client_name, client_email, invoice_number, amount, days_overdue, follow_up_status)
SELECT * FROM (VALUES
  ('Acme Corp', 'billing@acmecorp.com', 'INV-2024-001', 1200.00, 45, 'Escalated'),
  ('Stark Industries', 'accounts@stark.com', 'INV-2024-002', 850.00, 12, 'Reminder 1 Sent'),
  ('Wayne Enterprises', 'finance@wayne.com', 'INV-2024-003', 3400.00, 30, 'Reminder 2 Sent'),
  ('Globex Inc', 'ap@globex.com', 'INV-2024-004', 750.00, 7, 'Pending'),
  ('Initech LLC', 'billing@initech.com', 'INV-2024-005', 1500.00, 22, 'Reminder 1 Sent'),
  ('Umbrella Corp', 'payments@umbrella.com', 'INV-2024-006', 2200.00, 60, 'Escalated'),
  ('Soylent Corp', 'ar@soylent.com', 'INV-2024-007', 600.00, 3, 'Pending'),
  ('Hooli Inc', 'finance@hooli.com', 'INV-2024-008', 980.00, 18, 'Reminder 1 Sent')
)
AS t(client_name, client_email, invoice_number, amount, days_overdue, follow_up_status)
WHERE NOT EXISTS (SELECT 1 FROM invoices);
