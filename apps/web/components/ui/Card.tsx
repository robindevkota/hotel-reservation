import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  gold?: boolean; // gold border accent
}

export default function Card({ children, className = '', gold = false }: CardProps) {
  return (
    <div
      className={[
        'bg-white relative overflow-hidden',
        gold ? 'border border-[#C9A84C]' : 'border border-[#0D1B3E]/10',
        'shadow-[0_4px_24px_rgba(13,27,62,0.08)]',
        'transition-shadow duration-300 hover:shadow-[0_8px_32px_rgba(13,27,62,0.14)]',
        className,
      ].join(' ')}
    >
      {gold && (
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />
      )}
      {children}
    </div>
  );
}
