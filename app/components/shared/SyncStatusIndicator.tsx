/**
 * Sync Status Indicator
 * Shows when data was last updated
 */

'use client';

import { Clock } from 'lucide-react';

interface SyncStatusIndicatorProps {
  lastUpdated?: Date | string | null;
  hubspotDealId?: string | null;
  hubspotContactId?: string | null;
  className?: string;
  showDetails?: boolean;
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export function SyncStatusIndicator({
  lastUpdated,
  hubspotDealId: _hubspotDealId,
  hubspotContactId: _hubspotContactId,
  className = '',
  showDetails = false,
}: SyncStatusIndicatorProps) {
  const lastUpdateDate = lastUpdated ? new Date(lastUpdated) : null;
  const timeAgo = lastUpdateDate ? formatTimeAgo(lastUpdateDate) : 'Never';

  if (!showDetails || !lastUpdateDate) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      <span className="text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Updated {timeAgo}
      </span>
    </div>
  );
}

/**
 * Real-time Update Indicator
 * Shows a pulse animation when data is being updated in real-time
 */
interface RealtimeIndicatorProps {
  isActive: boolean;
  lastUpdate?: Date | null;
}

export function RealtimeIndicator({ isActive, lastUpdate }: RealtimeIndicatorProps) {
  if (!isActive) {
    return null;
  }

  const timeAgo = lastUpdate ? formatTimeAgo(lastUpdate) : null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </div>
        <span>Live</span>
      </div>
      {timeAgo && (
        <span>Last update: {timeAgo}</span>
      )}
    </div>
  );
}

