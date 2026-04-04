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
        className="absolute inset-0 bg-primary/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={[
          'relative bg-card border border-gold w-full max-w-lg max-h-[90vh] overflow-y-auto',
          'shadow-royal animate-fade-in',
          className,
        ].join(' ')}
      >
        <div className="w-full h-px bg-gradient-gold" />
        <div className="p-6">
          {title && (
            <h2 id="modal-title" className="font-display text-lg text-foreground mb-4 tracking-widest uppercase pr-8">
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-gold transition-colors text-2xl leading-none"
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
