'use client';
import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const styles: Record<Variant, string> = {
  primary:   'bg-gradient-gold text-primary hover:shadow-gold hover:-translate-y-0.5',
  secondary: 'bg-transparent text-gold border border-gold hover:bg-gold/10',
  ghost:     'bg-transparent text-cream-dark border border-cream-dark/30 hover:border-gold hover:text-gold',
  danger:    'bg-destructive text-destructive-foreground hover:opacity-90',
};

const sizes: Record<Size, string> = {
  sm: 'px-5 py-2 text-xs',
  md: 'px-7 py-3 text-sm',
  lg: 'px-10 py-4 text-sm',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2',
        'font-display tracking-[0.2em] uppercase',
        'transition-all duration-300',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
        styles[variant],
        sizes[size],
        className,
      ].join(' ')}
    >
      {loading && (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
