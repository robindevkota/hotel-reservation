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
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-xs font-[Cinzel] tracking-widest uppercase text-[#0D1B3E]">
          {label}
        </label>
      )}
      <select
        id={selectId}
        {...props}
        className={[
          'w-full px-4 py-3 bg-white',
          'border border-[#0D1B3E]/20 focus:border-[#C9A84C]',
          'text-[#0D1B3E] font-[Cormorant_Garamond] text-base',
          'outline-none transition-colors duration-200 cursor-pointer',
          error ? 'border-[#D32F2F]' : '',
          className,
        ].join(' ')}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-[#D32F2F] font-[Cinzel]">{error}</p>}
    </div>
  );
}
