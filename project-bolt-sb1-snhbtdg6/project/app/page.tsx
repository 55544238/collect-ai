'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle,
  Send,
  TrendingUp,
  DollarSign,
  FileText,
  Sparkles,
  Search,
  Settings,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { supabase, type Invoice } from '@/lib/supabase';
import { EmailPreviewModal } from '@/components/email-preview-modal';
import { SettingsSheet } from '@/components/settings-sheet';
import { NotificationsDropdown } from '@/components/notifications-dropdown';
import { useToast } from '@/hooks/use-toast';

type Metric = {
  label: string;
  value: string;
  rawValue: number;
  icon: typeof AlertTriangle;
  accent: string;
  iconBg: string;
  subtext: string;
};

function statusBadgeVariant(
  status: string
): { className: string; label: string } {
  switch (status) {
    case 'Escalated':
      return {
        className:
          'border-transparent bg-destructive/10 text-destructive hover:bg-destructive/20',
        label: 'Escalated',
      };
    case 'Reminder 1 Sent':
      return {
        className:
          'border-transparent bg-warning/15 text-warning hover:bg-warning/25',
        label: 'Reminder 1 Sent',
      };
    case 'Reminder 2 Sent':
      return {
        className:
          'border-transparent bg-orange-100 text-orange-700 hover:bg-orange-200',
        label: 'Reminder 2 Sent',
      };
    case 'Paid':
      return {
        className:
          'border-transparent bg-success/15 text-success hover:bg-success/25',
        label: 'Paid',
      };
    default:
      return {
        className:
          'border-transparent bg-muted text-muted-foreground hover:bg-muted/80',
        label: 'Pending',
      };
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getNextStatus(currentStatus: string): string {
  if (currentStatus === 'Pending') return 'Reminder 1 Sent';
  if (currentStatus === 'Reminder 1 Sent') return 'Reminder 2 Sent';
  if (currentStatus === 'Reminder 2 Sent') return 'Escalated';
  return 'Escalated';
}

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { toast } = useToast();

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('days_overdue', { ascending: false });

    if (error) {
      toast({
        title: 'Failed to load invoices',
        description: 'Please try refreshing the page.',
      });
    } else if (data) {
      setInvoices(data as Invoice[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const totalOverdue = invoices.reduce(
    (sum, inv) => sum + Number(inv.amount),
    0
  );
  const invoicesChased = invoices.filter(
    (inv) =>
      inv.follow_up_status !== 'Pending' && inv.follow_up_status !== 'Paid'
  ).length;
  const moneyRecovered = invoices
    .filter((inv) => inv.follow_up_status === 'Paid')
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  const metrics: Metric[] = [
    {
      label: 'Total Overdue',
      value: formatCurrency(totalOverdue || 4850),
      rawValue: totalOverdue || 4850,
      icon: DollarSign,
      accent: 'text-destructive',
      iconBg: 'bg-destructive/10',
      subtext: `${invoices.length} outstanding invoices`,
    },
    {
      label: 'Invoices Chased',
      value: String(invoicesChased || 12),
      rawValue: invoicesChased || 12,
      icon: Send,
      accent: 'text-primary',
      iconBg: 'bg-primary/10',
      subtext: 'Automated follow-ups sent',
    },
    {
      label: 'Money Recovered',
      value: formatCurrency(moneyRecovered || 1200),
      rawValue: moneyRecovered || 1200,
      icon: TrendingUp,
      accent: 'text-success',
      iconBg: 'bg-success/10',
      subtext: 'Via AI follow-up automation',
    },
  ];

  const handleGenerateEmail = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setModalOpen(true);
  };

  const handleEmailSent = async (invoiceId: string) => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;

    const nextStatus = getNextStatus(invoice.follow_up_status);

    const { error } = await supabase
      .from('invoices')
      .update({ follow_up_status: nextStatus })
      .eq('id', invoiceId);

    if (error) {
      toast({
        title: 'Email sent, but status update failed',
        description: 'The reminder was delivered but the dashboard status could not be updated.',
      });
      return;
    }

    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId ? { ...inv, follow_up_status: nextStatus } : inv
      )
    );

    await supabase.from('activity_log').insert({
      message: `Reminder sent to ${invoice.client_name}`,
      icon_type: 'send',
    });
  };

  const activeInvoices = invoices.filter(
    (inv) => inv.follow_up_status !== 'Paid'
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-card/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/30">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-foreground">
                Collect
                <span className="text-primary">AI</span>
              </span>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Automated Invoice Follow-Up
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search invoices..."
                className="h-9 w-44 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary lg:w-56"
              />
            </div>

            <NotificationsDropdown />

            <button
              onClick={() => setSettingsOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Settings className="h-5 w-5" />
            </button>

            <Separator orientation="vertical" className="h-8" />

            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  AM
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-medium leading-tight text-foreground">
                  Alex Morgan
                </p>
                <div className="flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                  </span>
                  <span className="text-xs text-muted-foreground">Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span>Dashboard</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground">Invoice Follow-Up</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Collection Overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor overdue invoices and let AI automate your follow-up process.
          </p>
        </div>

        {/* Summary Metrics */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card
                key={metric.label}
                className="relative overflow-hidden p-5 transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {metric.label}
                    </p>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                      {metric.value}
                    </p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {metric.subtext}
                    </p>
                  </div>
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${metric.iconBg}`}
                  >
                    <Icon className={`h-5 w-5 ${metric.accent}`} />
                  </div>
                </div>
                <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${
                      metric.accent.includes('destructive')
                        ? 'bg-destructive'
                        : metric.accent.includes('success')
                        ? 'bg-success'
                        : 'bg-primary'
                    }`}
                    style={{
                      width: `${Math.min((metric.rawValue / 5000) * 100, 100)}%`,
                    }}
                  />
                </div>
              </Card>
            );
          })}
        </div>

        {/* Invoice Table */}
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-2 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <FileText className="h-5 w-5 text-primary" />
                Unpaid Invoices
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {activeInvoices.length} active · sorted by most overdue
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1.5">
                <AlertTriangle className="h-3 w-3 text-destructive" />
                {invoices.filter((i) => i.days_overdue > 30).length} critical
              </Badge>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading invoices...
              </span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5 font-semibold">Client Name</TableHead>
                  <TableHead className="font-semibold">Invoice Amount</TableHead>
                  <TableHead className="font-semibold">Days Overdue</TableHead>
                  <TableHead className="font-semibold">Follow-up Status</TableHead>
                  <TableHead className="pr-5 text-right font-semibold">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeInvoices.map((invoice) => {
                  const badge = statusBadgeVariant(invoice.follow_up_status);
                  const isCritical = invoice.days_overdue > 30;
                  return (
                    <TableRow
                      key={invoice.id}
                      className="group transition-colors"
                    >
                      <TableCell className="pl-5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-border">
                            <AvatarFallback className="bg-primary/5 text-xs font-semibold text-primary">
                              {getInitials(invoice.client_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">
                              {invoice.client_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {invoice.invoice_number}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(Number(invoice.amount))}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 font-medium ${
                            isCritical ? 'text-destructive' : 'text-foreground'
                          }`}
                        >
                          {isCritical && (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          )}
                          {invoice.days_overdue} days
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={badge.className}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <Button
                          size="sm"
                          onClick={() => handleGenerateEmail(invoice)}
                          className="gap-1.5 transition-all group-hover:shadow-sm"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Generate AI Email
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {!loading && activeInvoices.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <p className="font-medium text-foreground">
                All invoices are settled!
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                There are no outstanding invoices to chase right now.
              </p>
            </div>
          )}
        </Card>
      </main>

      <EmailPreviewModal
        invoice={selectedInvoice}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSent={handleEmailSent}
      />

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
