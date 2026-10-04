import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Invoice = {
  id: string;
  client_name: string;
  client_email: string;
  invoice_number: string;
  amount: number;
  days_overdue: number;
  follow_up_status: string;
  created_at: string;
};

export type FollowUpStatus = 'Pending' | 'Reminder 1 Sent' | 'Reminder 2 Sent' | 'Escalated' | 'Paid';

export type BusinessSettings = {
  id: string;
  company_name: string;
  email: string;
  ai_tone: 'friendly' | 'firm';
  updated_at: string;
};

export type ActivityLog = {
  id: string;
  message: string;
  icon_type: string;
  created_at: string;
};

export const STATUS_FLOW: FollowUpStatus[] = [
  'Pending',
  'Reminder 1 Sent',
  'Reminder 2 Sent',
  'Escalated',
  'Paid',
];
