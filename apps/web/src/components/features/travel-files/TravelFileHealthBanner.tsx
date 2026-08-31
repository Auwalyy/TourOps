'use client';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface Props {
  health: { score: 'green' | 'yellow' | 'red'; issues: string[] };
  nextAction: { action: string; urgency: 'info' | 'warning' | 'critical' };
}

export function TravelFileHealthBanner({ health, nextAction }: Props) {
  const config = {
    green: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', icon: CheckCircle, iconColor: 'text-green-500', label: 'All Good' },
    yellow: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-800', icon: AlertTriangle, iconColor: 'text-yellow-500', label: 'Attention Required' },
    red: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: XCircle, iconColor: 'text-red-500', label: 'Urgent Action Required' },
  }[health.score];

  const Icon = config.icon;

  return (
    <div className={`rounded-xl border p-4 ${config.bg}`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${config.iconColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${config.text}`}>{config.label}</span>
          </div>
          <p className={`mt-0.5 text-sm ${config.text}`}>
            <span className="font-medium">Next: </span>{nextAction.action}
          </p>
          {health.issues.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {health.issues.map((issue, i) => (
                <li key={i} className={`text-xs ${config.text} opacity-80`}>• {issue}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
