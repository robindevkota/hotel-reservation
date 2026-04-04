import React from 'react';

type BadgeColor = 'gold' | 'navy' | 'green' | 'red' | 'orange' | 'gray';

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  className?: string;
}

const COLORS: Record<BadgeColor, string> = {
  gold:   'bg-gold/15 text-gold-dark border border-gold/40',
  navy:   'bg-primary/10 text-primary border border-primary/20',
  green:  'bg-green-50 text-green-800 border border-green-200',
  red:    'bg-red-50 text-red-800 border border-red-200',
  orange: 'bg-orange-50 text-orange-800 border border-orange-200',
  gray:   'bg-muted text-muted-foreground border border-border',
};

const STATUS_MAP: Record<string, BadgeColor> = {
  pending:         'gray',
  confirmed:       'navy',
  checked_in:      'green',
  checked_out:     'gold',
  cancelled:       'red',
  accepted:        'navy',
  preparing:       'orange',
  ready:           'gold',
  delivering:      'orange',
  delivered:       'green',
  open:            'gold',
  pending_payment: 'orange',
  paid:            'green',
};

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_MAP[status] || 'gray';
  const label = status.replace(/_/g, ' ');
  return <Badge color={color}>{label}</Badge>;
}

export default function Badge({ children, color = 'gold', className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2.5 py-0.5 text-xs font-display tracking-wider uppercase',
        COLORS[color],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
