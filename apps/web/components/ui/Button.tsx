'use client';
import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  as?: 'button' | 'a';
  href?: string;
}

const styles: Record<Variant, string> = {
  primary:   'bg-[#C9A84C] text-[#0D1B3E] hover:bg-[#E8C97A] border border-[#C9A84C]',
  secondary: 'bg-transparent text-[#C9A84C] border border-[#C9A84C] hover:bg-[#C9A84C] hover:text-[#0D1B3E]',
  ghost:     'bg-transparent text-[#F5ECD7] border border-[#F5ECD7]/30 hover:border-[#C9A84C] hover:text-[#C9A84C]',
  danger:    'bg-[#D32F2F] text-white border border-[#D32F2F] hover:bg-[#B71C1C]',
};

const sizes: Record<Size, string> = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3 text-sm',
  lg: 'px-10 py-4 text-base',
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
        'font-[Cinzel] tracking-widest uppercase',
        'transition-all duration-300',
        'disabled:opacity-50 disabled:cursor-not-allowed',
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
