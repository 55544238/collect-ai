'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Mail, DollarSign, Calendar, Loader2, Plus, Pencil, Link } from 'lucide-react';
import { supabase, type Invoice } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingInvoice: Invoice | null;
  onSaved: () => void;
}

export function InvoiceFormDialog({
  open,
  onOpenChange,
  editingInvoice,
  onSaved,
}: InvoiceFormDialogProps) {
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      if (editingInvoice) {
        setClientName(editingInvoice.client_name);
        setClientEmail(editingInvoice.client_email);
        setAmount(String(editingInvoice.amount));
        setDueDate(editingInvoice.due_date || '');
        setPaymentLink(editingInvoice.payment_link || '');
      } else {
        setClientName('');
        setClientEmail('');
        setAmount('');
        setDueDate('');
        setPaymentLink('');
      }
    }
  }, [open, editingInvoice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim() || !clientEmail.trim() || !amount || !dueDate) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields.',
      });
      return;
    }

    const parsedDate = new Date(dueDate);
    if (isNaN(parsedDate.getTime())) {
      toast({
        title: 'Invalid due date',
        description: 'Please select a valid calendar date.',
      });
      return;
    }

    const minDate = new Date('2000-01-01');
    if (parsedDate < minDate) {
      toast({
        title: 'Invalid due date',
        description: 'The due date cannot be earlier than the year 2000.',
      });
      return;
    }

    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 5);
    if (parsedDate > maxDate) {
      toast({
        title: 'Invalid due date',
        description: 'The due date cannot be more than 5 years in the future.',
      });
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid invoice amount.',
      });
      return;
    }

    setSaving(true);

    if (editingInvoice) {
      const { error } = await supabase
        .from('invoices')
        .update({
          client_name: clientName.trim(),
          client_email: clientEmail.trim(),
          amount: parsedAmount,
          due_date: dueDate,
          payment_link: paymentLink.trim() || null,
        })
        .eq('id', editingInvoice.id);

      if (error) {
        toast({
          title: 'Failed to update invoice',
          description: error.message,
        });
        setSaving(false);
        return;
      }

      toast({
        title: 'Invoice updated',
        description: `${clientName} has been updated successfully.`,
      });
    } else {
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(
        Math.floor(Math.random() * 9000) + 1000
      )}`;

      const { error } = await supabase.from('invoices').insert({
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        invoice_number: invoiceNumber,
        amount: parsedAmount,
        due_date: dueDate,
        payment_link: paymentLink.trim() || null,
        days_overdue: Math.floor(
          (Date.now() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24)
        ),
        follow_up_status: 'Pending',
      });

      if (error) {
        toast({
          title: 'Failed to add invoice',
          description: error.message,
        });
        setSaving(false);
        return;
      }

      toast({
        title: 'Invoice added',
        description: `${clientName} has been added to your invoices.`,
      });
    }

    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              {editingInvoice ? (
                <Pencil className="h-5 w-5 text-primary" />
              ) : (
                <Plus className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <DialogTitle>
                {editingInvoice ? 'Edit Invoice' : 'Add New Invoice'}
              </DialogTitle>
              <DialogDescription>
                {editingInvoice
                  ? 'Update the invoice details below.'
                  : 'Enter the details for the new invoice.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client-name" className="flex items-center gap-1.5 text-sm font-medium">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              Client Name
            </Label>
            <Input
              id="client-name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Acme Corp"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-email" className="flex items-center gap-1.5 text-sm font-medium">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              Client Email
            </Label>
            <Input
              id="client-email"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="billing@acmecorp.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="flex items-center gap-1.5 text-sm font-medium">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              Amount (USD)
            </Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1500.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="due-date" className="flex items-center gap-1.5 text-sm font-medium">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              Due Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min="2000-01-01"
              max={`${new Date().getFullYear() + 5}-12-31`}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-link" className="flex items-center gap-1.5 text-sm font-medium">
              <Link className="h-3.5 w-3.5 text-muted-foreground" />
              Payment Link (optional)
            </Label>
            <Input
              id="payment-link"
              type="url"
              value={paymentLink}
              onChange={(e) => setPaymentLink(e.target.value)}
              placeholder="https://pay.example.com/invoice"
            />
            <p className="text-xs text-muted-foreground">
              Include a "Pay Now" link in AI-generated reminder emails.
            </p>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {editingInvoice ? 'Saving...' : 'Adding...'}
                </>
              ) : (
                <>
                  {editingInvoice ? (
                    <>
                      <Pencil className="h-4 w-4" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add Invoice
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
