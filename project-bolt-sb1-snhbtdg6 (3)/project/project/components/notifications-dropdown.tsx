'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Bell, Send, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { supabase, type ActivityLog } from '@/lib/supabase';
import { cn } from '@/lib/utils';

function getIcon(iconType: string) {
  switch (iconType) {
    case 'alert':
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    case 'check':
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    default:
      return <Send className="h-4 w-4 text-primary" />;
  }
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return '1 day ago';
  return `${diffDay} days ago`;
}

export function NotificationsDropdown() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setActivities(data as ActivityLog[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Bell className="h-5 w-5" />
          {activities.length > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 p-0"
        sideOffset={8}
      >
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold">
          Recent Activity
          {activities.length > 0 && (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
              {activities.length} new
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        {loading ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            Loading activity...
          </div>
        ) : activities.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            No recent activity
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto py-1">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className={cn(
                  'flex items-start gap-3 px-3 py-2.5 transition-colors hover:bg-accent/50'
                )}
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
                  {getIcon(activity.icon_type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{activity.message}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {timeAgo(activity.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
