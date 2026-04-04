'use client';
import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export default function Select({ label, error, options, className = '', id, ...props }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-xs font-display tracking-widest uppercase text-foreground">
          {label}
        </label>
      )}
      <select
        id={selectId}
        {...props}
        className={[
          'w-full px-4 py-3 bg-card',
          'border outline-none transition-colors duration-200 cursor-pointer',
          'text-foreground font-elegant text-base',
          error
            ? 'border-destructive focus:border-destructive'
            : 'border-border focus:border-gold',
          className,
        ].join(' ')}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-destructive font-body">{error}</p>}
    </div>
  );
}
