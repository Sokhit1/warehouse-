import { CheckCheck, CheckCircle2, Clock, PackageOpen } from 'lucide-react';
import { TruckStatus } from '../types/warehouse';

interface StatusBadgeProps {
  status: TruckStatus;
  compact?: boolean;
}

const STATUS_STYLES: Record<
  TruckStatus,
  {
    bg: string;
    text: string;
    border: string;
    icon: typeof Clock;
  }
> = {
  'Not started': {
    bg: 'bg-[#F3F5F4]',
    text: 'text-[#4B5953]',
    border: 'border-[#DCE2DF]',
    icon: Clock,
  },
  Loading: {
    bg: 'bg-[#FEF7E6]',
    text: 'text-[#9A5B04]',
    border: 'border-[#F5DFB0]',
    icon: PackageOpen,
  },
  Ready: {
    bg: 'bg-[#E9F7F3]',
    text: 'text-[#0E6455]',
    border: 'border-[#BEE6DB]',
    icon: CheckCircle2,
  },
  Completed: {
    bg: 'bg-[#EAF5EE]',
    text: 'text-[#145338]',
    border: 'border-[#C1E0CE]',
    icon: CheckCheck,
  },
};

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  const style = STATUS_STYLES[status];
  const Icon = style.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium whitespace-nowrap shrink-0 ${
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      } ${style.bg} ${style.text} ${style.border}`}
    >
      <Icon className={compact ? 'h-3 w-3 shrink-0' : 'h-3.5 w-3.5 shrink-0'} aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}
