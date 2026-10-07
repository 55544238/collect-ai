'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Building2, Mail, MessageSquare, Loader2, Check, MapPin, PenLine } from 'lucide-react';
import { supabase, type BusinessSettings } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [aiTone, setAiTone] = useState<'friendly' | 'firm'>('friendly');
  const [businessAddress, setBusinessAddress] = useState('');
  const [emailSignature, setEmailSignature] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('business_settings')
      .select('*')
      .eq('user_id', user?.id)
      .maybeSingle();

    if (error) {
      toast({
        title: 'Failed to load settings',
        description: 'Please try again.',
      });
    } else if (data) {
      const s = data as BusinessSettings;
      setSettings(s);
      setCompanyName(s.company_name);
      setEmail(s.email);
      setAiTone(s.ai_tone);
      setBusinessAddress(s.business_address || '');
      setEmailSignature(s.email_signature || '');
    } else {
      setSettings(null);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open, fetchSettings]);

  const handleSave = async () => {
    setSaving(true);

    if (settings) {
      const { error } = await supabase
        .from('business_settings')
        .update({
          company_name: companyName,
          email: email,
          ai_tone: aiTone,
          business_address: businessAddress.trim() || null,
          email_signature: emailSignature.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      if (error) {
        toast({
          title: 'Failed to save settings',
          description: 'Please try again.',
        });
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from('business_settings')
        .insert({
          company_name: companyName,
          email: email,
          ai_tone: aiTone,
          business_address: businessAddress.trim() || null,
          email_signature: emailSignature.trim() || null,
        });

      if (error) {
        toast({
          title: 'Failed to save settings',
          description: 'Please try again.',
        });
        setSaving(false);
        return;
      }
    }

    toast({
      title: 'Settings saved',
      description: 'Your business profile has been updated.',
    });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-xl">Business Settings</SheetTitle>
          <SheetDescription>
            Configure your business profile and AI follow-up preferences.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-2">
            <div className="space-y-2">
              <Label htmlFor="company-name" className="flex items-center gap-1.5 text-sm font-medium">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                Company Name
              </Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your company name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1.5 text-sm font-medium">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@yourcompany.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business-address" className="flex items-center gap-1.5 text-sm font-medium">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Business Address
              </Label>
              <Textarea
                id="business-address"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder="123 Main St, Suite 100&#10;San Francisco, CA 94101"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Included at the bottom of AI-generated reminder emails.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-signature" className="flex items-center gap-1.5 text-sm font-medium">
                <PenLine className="h-3.5 w-3.5 text-muted-foreground" />
                Email Signature
              </Label>
              <Textarea
                id="email-signature"
                value={emailSignature}
                onChange={(e) => setEmailSignature(e.target.value)}
                placeholder="Jane Doe&#10;Accounts Receivable&#10;Acme Corp&#10;Phone: (555) 123-4567"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Replaces the default sign-off in reminder emails.
              </p>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                Preferred AI Follow-up Tone
              </Label>
              <RadioGroup
                value={aiTone}
                onValueChange={(v) => setAiTone(v as 'friendly' | 'firm')}
                className="gap-3"
              >
                <button
                  type="button"
                  onClick={() => setAiTone('friendly')}
                  className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-all ${
                    aiTone === 'friendly'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <RadioGroupItem value="friendly" className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Friendly</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Warm, polite reminders that maintain a positive client relationship.
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setAiTone('firm')}
                  className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-all ${
                    aiTone === 'firm'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <RadioGroupItem value="firm" className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Firm</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Direct, professional reminders with clear deadlines and escalation language.
                    </p>
                  </div>
                </button>
              </RadioGroup>
            </div>
          </div>
        )}

        <SheetFooter className="mt-auto">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
