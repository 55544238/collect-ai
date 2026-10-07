'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import {
  AlertTriangle,
  Send,
  TrendingUp,
  DollarSign,
  FileText,
  Sparkles,
  Settings,
  ChevronRight,
  Loader2,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  MoreHorizontal,
  ArrowUpDown,
  Search,
  X,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { supabase, type Invoice } from '@/lib/supabase';
import { EmailPreviewModal } from '@/components/email-preview-modal';
import { SettingsSheet } from '@/components/settings-sheet';
import { NotificationsDropdown } from '@/components/notifications-dropdown';
import { ThemeToggle } from '@/components/theme-toggle';
import { InvoiceFormDialog } from '@/components/invoice-form-dialog';
import { DeleteInvoiceDialog } from '@/components/delete-invoice-dialog';
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

type StatusFilter = 'all' | 'Pending' | 'Reminder 1 Sent' | 'Reminder 2 Sent' | 'Escalated' | 'Paid';
type SortDirection = 'desc' | 'asc';

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
          'border-transparent bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:hover:bg-orange-900/60',
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

function calcDaysOverdue(invoice: Invoice): number {
  if (invoice.follow_up_status === 'Paid' || !invoice.due_date) return 0;
  const due = new Date(invoice.due_date).getTime();
  if (isNaN(due)) return 0;
  const diff = Date.now() - due;
  return diff > 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) : 0;
}

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/auth');
        return;
      }
      setUser(session.user);
      setAuthChecking(false);
    })();
  }, [router]);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setLoadError("We couldn't load your invoices. This is usually a temporary connection issue — please try again.");
      setLoading(false);
    } else if (data) {
      setInvoices(data as Invoice[]);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchInvoices();
    }
  }, [user, fetchInvoices]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/auth');
  };

  const handleAddInvoice = () => {
    setEditingInvoice(null);
    setFormOpen(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormOpen(true);
  };

  const handleDeleteClick = (invoice: Invoice) => {
    setDeletingInvoice(invoice);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingInvoice) return;
    setActionLoadingId(deletingInvoice.id);

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', deletingInvoice.id);

    if (error) {
      toast({
        title: 'Failed to delete invoice',
        description: error.message,
      });
      setActionLoadingId(null);
      return;
    }

    setInvoices((prev) => prev.filter((inv) => inv.id !== deletingInvoice.id));
    toast({
      title: 'Invoice deleted',
      description: `${deletingInvoice.client_name} has been removed.`,
    });
    setDeletingInvoice(null);
    setDeleteOpen(false);
    setActionLoadingId(null);
  };

  const handleMarkAsPaid = async (invoice: Invoice) => {
    setActionLoadingId(invoice.id);

    const now = new Date().toISOString();

    const { error } = await supabase
      .from('invoices')
      .update({ follow_up_status: 'Paid', paid_at: now })
      .eq('id', invoice.id);

    if (error) {
      toast({
        title: 'Failed to mark as paid',
        description: error.message,
      });
      setActionLoadingId(null);
      return;
    }

    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoice.id ? { ...inv, follow_up_status: 'Paid', paid_at: now } : inv
      )
    );

    await supabase.from('activity_log').insert({
      message: `Payment received from ${invoice.client_name}`,
      icon_type: 'check',
    });

    toast({
      title: 'Marked as paid',
      description: `${formatCurrency(Number(invoice.amount))} from ${invoice.client_name} added to recovered.`,
    });
    setActionLoadingId(null);
  };

  const handleGenerateEmail = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setModalOpen(true);
  };

  const handleEmailSent = async (invoiceId: string) => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;

    const nextStatus = getNextStatus(invoice.follow_up_status);
    const now = new Date().toISOString();

    const updateData: Record<string, string> = { follow_up_status: nextStatus };
    if (nextStatus === 'Reminder 1 Sent') {
      updateData.first_reminder_at = now;
    } else if (nextStatus === 'Reminder 2 Sent') {
      updateData.second_reminder_at = now;
    }

    const { error } = await supabase
      .from('invoices')
      .update(updateData)
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
        inv.id === invoiceId ? { ...inv, ...updateData } : inv
      )
    );

    await supabase.from('activity_log').insert({
      message: `Reminder sent to ${invoice.client_name}`,
      icon_type: 'send',
    });
  };

  const filteredInvoices = useMemo(() => {
    let result = invoices;

    if (statusFilter !== 'all') {
      result = result.filter((inv) => inv.follow_up_status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.client_name.toLowerCase().includes(q) ||
          inv.invoice_number.toLowerCase().includes(q) ||
          inv.client_email.toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      const aDays = calcDaysOverdue(a);
      const bDays = calcDaysOverdue(b);
      return sortDirection === 'desc' ? bDays - aDays : aDays - bDays;
    });

    return result;
  }, [invoices, statusFilter, searchQuery, sortDirection]);

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const totalOverdue = invoices
    .filter((inv) => inv.follow_up_status !== 'Paid')
    .reduce((sum, inv) => sum + Number(inv.amount), 0);
  const invoicesChased = invoices.filter(
    (inv) =>
      inv.follow_up_status !== 'Pending' && inv.follow_up_status !== 'Paid'
  ).length;
  const moneyRecovered = invoices
    .filter(
      (inv) =>
        inv.follow_up_status === 'Paid' &&
        inv.paid_at != null &&
        (inv.first_reminder_at != null || inv.second_reminder_at != null)
    )
    .reduce((sum, inv) => sum + Number(inv.amount), 0);
  const outstandingCount = invoices.filter(
    (inv) => inv.follow_up_status !== 'Paid'
  ).length;

  const metrics: Metric[] = [
    {
      label: 'Total Overdue',
      value: formatCurrency(totalOverdue),
      rawValue: totalOverdue,
      icon: DollarSign,
      accent: 'text-destructive',
      iconBg: 'bg-destructive/10',
      subtext: `${outstandingCount} outstanding invoices`,
    },
    {
      label: 'Invoices Chased',
      value: String(invoicesChased),
      rawValue: invoicesChased,
      icon: Send,
      accent: 'text-primary',
      iconBg: 'bg-primary/10',
      subtext: 'Automated follow-ups sent',
    },
    {
      label: 'Money Recovered',
      value: formatCurrency(moneyRecovered),
      rawValue: moneyRecovered,
      icon: TrendingUp,
      accent: 'text-success',
      iconBg: 'bg-success/10',
      subtext: 'Via AI follow-up automation',
    },
  ];

  const displayName = user.email?.split('@')[0] || 'User';
  const initials = displayName
    .split(/[.\-_]/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const hasInvoices = invoices.length > 0;
  const showEmptyState = !loading && !loadError && invoices.length === 0;
  const showNoResults = !loading && !loadError && invoices.length > 0 && filteredInvoices.length === 0;

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
            <NotificationsDropdown />

            <ThemeToggle />

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
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-medium leading-tight text-foreground">
                  {user.email}
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

            <button
              onClick={handleSignOut}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
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
          <Button onClick={handleAddInvoice} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            Add Invoice
          </Button>
        </div>

        {/* Summary Metrics */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <>
              {[0, 1, 2].map((i) => (
                <Card key={i} className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-32" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-11 w-11 rounded-xl" />
                  </div>
                  <Skeleton className="mt-4 h-1 w-full rounded-full" />
                </Card>
              ))}
            </>
          ) : (
            metrics.map((metric) => {
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
            })
          )}
        </div>

        {/* Invoice Table */}
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FileText className="h-5 w-5 text-primary" />
                  Invoices
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {hasInvoices
                    ? `${filteredInvoices.length} shown · ${outstandingCount} active`
                    : 'No invoices yet'}
                </p>
              </div>
              {hasInvoices && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-destructive" />
                    {invoices.filter((i) => calcDaysOverdue(i) > 30 && i.follow_up_status !== 'Paid').length} critical
                  </Badge>
                </div>
              )}
            </div>

            {/* Search & Filters */}
            {hasInvoices && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by client, invoice #, or email..."
                    className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger className="h-9 w-full sm:w-44">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Reminder 1 Sent">Reminder 1 Sent</SelectItem>
                    <SelectItem value="Reminder 2 Sent">Reminder 2 Sent</SelectItem>
                    <SelectItem value="Escalated">Escalated</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
                <button
                  onClick={() => setSortDirection((d) => (d === 'desc' ? 'asc' : 'desc'))}
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  {sortDirection === 'desc' ? 'Most overdue' : 'Least overdue'}
                </button>
              </div>
            )}
          </div>

          {/* Error State */}
          {loadError && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <p className="font-medium text-foreground">Failed to load invoices</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">{loadError}</p>
              <Button onClick={fetchInvoices} variant="outline" className="mt-4 gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          )}

          {/* Loading Skeletons */}
          {loading && !loadError && (
            <div className="space-y-3 p-5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-8 w-28" />
                </div>
              ))}
            </div>
          )}

          {/* Invoice Table */}
          {!loading && !loadError && filteredInvoices.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5 font-semibold">Client Name</TableHead>
                  <TableHead className="font-semibold">Invoice Amount</TableHead>
                  <TableHead className="font-semibold">Days Overdue</TableHead>
                  <TableHead className="font-semibold">Follow-up Status</TableHead>
                  <TableHead className="pr-5 text-right font-semibold">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => {
                  const badge = statusBadgeVariant(invoice.follow_up_status);
                  const isCritical = calcDaysOverdue(invoice) > 30;
                  const isPaid = invoice.follow_up_status === 'Paid';
                  const isActionLoading = actionLoadingId === invoice.id;
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
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                            Paid
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 font-medium ${
                              isCritical ? 'text-destructive' : 'text-foreground'
                            }`}
                          >
                            {isCritical && (
                              <AlertTriangle className="h-3.5 w-3.5" />
                            )}
                            {(() => {
                              const days = calcDaysOverdue(invoice);
                              return days > 0 ? `${days} days` : 'Not overdue';
                            })()}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={badge.className}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isPaid && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGenerateEmail(invoice)}
                              className="gap-1.5 transition-all group-hover:shadow-sm"
                              disabled={isActionLoading}
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">AI Email</span>
                            </Button>
                          )}
                          {!isPaid && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAsPaid(invoice)}
                              className="gap-1.5 border-success/30 text-success hover:bg-success/10 hover:text-success"
                              disabled={isActionLoading}
                            >
                              {isActionLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              <span className="hidden sm:inline">Mark Paid</span>
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                disabled={isActionLoading}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEditInvoice(invoice)}
                                className="gap-2"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit Invoice
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(invoice)}
                                className="gap-2 text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete Invoice
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Empty State — no invoices at all */}
          {showEmptyState && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <p className="text-lg font-medium text-foreground">
                No invoices yet
              </p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Add your first invoice to start tracking overdue payments and automating follow-ups.
              </p>
              <Button onClick={handleAddInvoice} className="mt-5 gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Invoice
              </Button>
            </div>
          )}

          {/* No results from filter */}
          {showNoResults && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground">No matching invoices</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your search or filter.
              </p>
              <Button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                variant="outline"
                className="mt-4 gap-2"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
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

      <InvoiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingInvoice={editingInvoice}
        onSaved={fetchInvoices}
      />

      <DeleteInvoiceDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        invoice={deletingInvoice}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
