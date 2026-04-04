import React from 'react';

export default function GoldDivider({ ornament = '𓂀' }: { ornament?: string }) {
  return (
    <div className="flex items-center gap-4 my-8" aria-hidden="true">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold" />
      <span className="text-gold text-lg select-none">{ornament}</span>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold" />
    </div>
  );
}
