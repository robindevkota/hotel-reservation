import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  gold?: boolean;
}

export default function Card({ children, className = '', gold = false }: CardProps) {
  return (
    <div
      className={[
        'bg-card relative overflow-hidden',
        gold ? 'border border-gold shadow-gold' : 'border border-border shadow-royal',
        'transition-all duration-300',
        className,
      ].join(' ')}
    >
      {gold && (
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-gold" />
      )}
      {children}
    </div>
  );
}
