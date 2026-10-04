'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Send, Sparkles, Loader2, CheckCircle2, Copy } from 'lucide-react';
import type { Invoice } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface EmailPreviewModalProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: (invoiceId: string) => void;
}

function getTone(status: string): { label: string; description: string } {
  if (status === 'Escalated') {
    return {
      label: 'Firm — Final Notice',
      description:
        'This is a firm final notice before further collection action is taken.',
    };
  }
  if (status === 'Reminder 2 Sent') {
    return {
      label: 'Firm — Second Reminder',
      description:
        'A firm second reminder referencing the prior follow-up.',
    };
  }
  return {
    label: 'Friendly — First Reminder',
    description: 'A polite first reminder maintaining a warm relationship.',
  };
}

function generateEmailSubject(invoice: Invoice): string {
  const tone = getTone(invoice.follow_up_status);
  if (tone.label.startsWith('Firm — Final')) {
    return `FINAL NOTICE: Invoice ${invoice.invoice_number} — ${invoice.days_overdue} Days Overdue`;
  }
  if (tone.label.startsWith('Firm')) {
    return `Second Reminder: Invoice ${invoice.invoice_number} — Action Required`;
  }
  return `Friendly Reminder: Invoice ${invoice.invoice_number} is Overdue`;
}

function generateEmailBody(invoice: Invoice): string {
  const tone = getTone(invoice.follow_up_status);
  const firstName = invoice.client_name.split(' ')[0];
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(invoice.amount);

  if (tone.label.startsWith('Firm — Final')) {
    return `Dear ${firstName},

Despite multiple reminders, Invoice ${invoice.invoice_number} for ${formattedAmount} remains unpaid and is now ${invoice.days_overdue} days overdue.

This is our final notice before we escalate this matter to our collections department. We strongly prefer to resolve this amicably and avoid any disruption to your account or ongoing services.

Please process payment immediately and reply to this email with confirmation. If there is a genuine dispute or issue, contact us within 48 hours so we can work toward a resolution.

Our records show:
  • Invoice: ${invoice.invoice_number}
  • Amount Due: ${formattedAmount}
  • Days Overdue: ${invoice.days_overdue}

We urge you to treat this with urgency.

Regards,
Collections Team
CollectAI Automated Follow-Up`;
  }

  if (tone.label.startsWith('Firm')) {
    return `Dear ${firstName},

We're following up again regarding Invoice ${invoice.invoice_number} for ${formattedAmount}, which is now ${invoice.days_overdue} days overdue.

Our previous reminder does not appear to have been actioned. We understand that payments can occasionally slip through the cracks, so we wanted to reach out once more before considering escalation.

Could you please confirm the status of this payment or let us know if there is an issue we can help resolve?

  • Invoice: ${invoice.invoice_number}
  • Amount Due: ${formattedAmount}
  • Days Overdue: ${invoice.days_overdue}

We'd appreciate a response within 5 business days.

Best regards,
CollectAI Automated Follow-Up`;
  }

  return `Hi ${firstName},

Hope you're doing well!

Just a friendly nudge that Invoice ${invoice.invoice_number} for ${formattedAmount} is currently ${invoice.days_overdue} days overdue. We know things can get busy, so we wanted to send a quick reminder in case this one slipped through the cracks.

Here are the details:
  • Invoice: ${invoice.invoice_number}
  • Amount Due: ${formattedAmount}
  • Days Overdue: ${invoice.days_overdue}

If payment has already been sent, please disregard this note — and thank you! If you have any questions or need more time, just reply to this email and we'll be happy to help.

Thanks so much for your business!

Warm regards,
CollectAI Automated Follow-Up`;
}

export function EmailPreviewModal({
  invoice,
  open,
  onOpenChange,
  onSent,
}: EmailPreviewModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!invoice) return;
    setIsGenerating(true);
    setEmailSubject('');
    setEmailBody('');

    await new Promise((resolve) => setTimeout(resolve, 1200));

    setEmailSubject(generateEmailSubject(invoice));
    setEmailBody(generateEmailBody(invoice));
    setIsGenerating(false);
  };

  const handleSend = async () => {
    if (!invoice) return;
    setIsSending(true);

    await new Promise((resolve) => setTimeout(resolve, 800));

    setIsSending(false);
    onSent(invoice.id);
    onOpenChange(false);
    toast({
      title: 'Reminder sent',
      description: `Follow-up email delivered to ${invoice.client_email}.`,
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBody}`);
    toast({
      title: 'Copied to clipboard',
      description: 'The email draft has been copied.',
    });
  };

  const tone = invoice ? getTone(invoice.follow_up_status) : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setEmailSubject('');
          setEmailBody('');
          setIsGenerating(false);
          setIsSending(false);
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>AI-Generated Reminder Email</DialogTitle>
              <DialogDescription>
                {invoice &&
                  `For ${invoice.client_name} — ${invoice.invoice_number}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!emailSubject && !isGenerating && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent">
              <Mail className="h-7 w-7 text-primary" />
            </div>
            <p className="mb-1 font-medium text-foreground">
              Ready to generate a personalized follow-up email
            </p>
            <p className="mb-5 max-w-sm text-sm text-muted-foreground">
              Our AI will draft a {tone?.label.toLowerCase()} tailored to this
              client's overdue status.
            </p>
            <Button onClick={handleGenerate} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Generate AI Email
            </Button>
          </div>
        )}

        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">
              Crafting your email draft...
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Analyzing client history and overdue status
            </p>
          </div>
        )}

        {emailSubject && !isGenerating && (
          <>
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-sm font-medium text-primary">
                {tone?.label}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Subject
                </label>
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">
                  {emailSubject}
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Body
                  </label>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </button>
                </div>
                <ScrollArea className="h-[280px] rounded-md border bg-white p-4">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                    {emailBody}
                  </pre>
                </ScrollArea>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={isSending}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Regenerate
              </Button>
              <Button
                onClick={handleSend}
                disabled={isSending}
                className="gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Reminder
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
