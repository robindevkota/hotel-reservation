'use client';
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export default function Input({ label, error, hint, className = '', id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-display tracking-widest uppercase text-foreground">
          {label}
        </label>
      )}
      <input
        id={inputId}
        {...props}
        className={[
          'w-full px-4 py-3 bg-card',
          'border outline-none transition-colors duration-200',
          'text-foreground font-elegant text-base',
          'placeholder:text-muted-foreground',
          error
            ? 'border-destructive focus:border-destructive'
            : 'border-border focus:border-gold',
          className,
        ].join(' ')}
      />
      {error && <p className="text-xs text-destructive font-body">{error}</p>}
      {hint && !error && <p className="text-xs text-muted-foreground font-body">{hint}</p>}
    </div>
  );
}
