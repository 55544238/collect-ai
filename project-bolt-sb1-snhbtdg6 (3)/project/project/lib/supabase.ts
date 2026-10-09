import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Invoice = {
  id: string;
  client_name: string;
  client_email: string;
  invoice_number: string;
  amount: number;
  days_overdue: number;
  due_date: string | null;
  payment_link: string | null;
  follow_up_status: string;
  paid_at: string | null;
  first_reminder_at: string | null;
  second_reminder_at: string | null;
  created_at: string;
  user_id: string | null;
};

export type FollowUpStatus = 'Pending' | 'Reminder 1 Sent' | 'Reminder 2 Sent' | 'Escalated' | 'Paid';

export type BusinessSettings = {
  id: string;
  company_name: string;
  email: string;
  ai_tone: 'friendly' | 'firm';
  business_address: string | null;
  email_signature: string | null;
  updated_at: string;
  user_id: string | null;
};

export type ActivityLog = {
  id: string;
  message: string;
  icon_type: string;
  created_at: string;
  user_id: string | null;
};

export const STATUS_FLOW: FollowUpStatus[] = [
  'Pending',
  'Reminder 1 Sent',
  'Reminder 2 Sent',
  'Escalated',
  'Paid',
];
