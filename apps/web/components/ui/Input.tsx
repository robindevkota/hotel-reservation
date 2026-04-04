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
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-[Cinzel] tracking-widest uppercase text-[#0D1B3E]"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        {...props}
        className={[
          'w-full px-4 py-3 bg-white',
          'border border-[#0D1B3E]/20 focus:border-[#C9A84C]',
          'text-[#0D1B3E] font-[Cormorant_Garamond] text-base',
          'outline-none transition-colors duration-200',
          'placeholder:text-[#5A6478]',
          error ? 'border-[#D32F2F]' : '',
          className,
        ].join(' ')}
      />
      {error && <p className="text-xs text-[#D32F2F] font-[Cinzel]">{error}</p>}
      {hint && !error && <p className="text-xs text-[#5A6478]">{hint}</p>}
    </div>
  );
}
