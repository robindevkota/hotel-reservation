'use client';
import React, { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export default function Modal({ open, onClose, title, children, className = '' }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        className="absolute inset-0 bg-[#0D1B3E]/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={[
          'relative bg-[#F5ECD7] border border-[#C9A84C] w-full max-w-lg max-h-[90vh] overflow-y-auto',
          'shadow-[0_24px_80px_rgba(13,27,62,0.4)]',
          'animate-fade-up',
          className,
        ].join(' ')}
      >
        <div className="h-[2px] bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />
        <div className="p-6">
          {title && (
            <h2 id="modal-title" className="text-xl font-[Cinzel] text-[#0D1B3E] mb-4 tracking-widest uppercase">
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#5A6478] hover:text-[#C9A84C] transition-colors text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}
