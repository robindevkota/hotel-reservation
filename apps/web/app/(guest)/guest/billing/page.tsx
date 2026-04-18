'use client';
import React, { useState } from 'react';
import { useBilling } from '../../../../hooks/useBilling';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import { Receipt, CheckCircle2, CreditCard } from 'lucide-react';
const GOLD = 'hsl(43 72% 55%)';
const NAVY = 'hsl(220 55% 14%)';
const CREAM = 'hsl(40 30% 96%)';

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  open:            { color: GOLD,                bg: `${GOLD}15`,               label: 'Open' },
  pending_payment: { color: 'hsl(200 70% 45%)', bg: 'hsl(200 70% 45% / 0.12)', label: 'Awaiting Payment' },
  paid:            { color: 'hsl(142 60% 40%)', bg: 'hsl(142 60% 40% / 0.1)',  label: 'Paid' },
};

function cleanDescription(desc: string): string {
  return desc.replace(/\s+#?[0-9a-f]{24}/gi, '').trim();
}

export default function BillingPage() {
  const { bill, loading } = useBilling(true);
  const [paying, setPaying] = useState(false);

  const handlePayment = async () => {
    if (!bill) return;
    setPaying(true);
    try {
      await api.post('/payment/intent', { billId: bill._id });
      toast.success('Payment initiated — please complete the process.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ width: '2.5rem', height: '2.5rem', border: `2px solid ${GOLD}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const statusStyle = STATUS_STYLES[bill?.status || 'open'] || STATUS_STYLES.open;

  return (
    <div style={{ background: CREAM, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: NAVY, padding: '2rem 1.5rem 2rem', textAlign: 'center', borderBottom: `1px solid ${GOLD}30` }}>
        <p style={{ fontFamily: "'Cinzel', serif", color: GOLD, fontSize: '0.6rem', letterSpacing: '0.45em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Your Account</p>
        <h1 style={{ fontFamily: "'Cinzel Decorative', serif", color: 'hsl(40 30% 94%)', fontSize: '1.4rem' }}>Running Bill</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem' }}>
          <div style={{ flex: 1, height: '1px', background: `linear-gradient(to right, transparent, ${GOLD}40)` }} />
          <span style={{ color: GOLD }}>𓎛</span>
          <div style={{ flex: 1, height: '1px', background: `linear-gradient(to left, transparent, ${GOLD}40)` }} />
        </div>
      </div>

      <div style={{ padding: '1.5rem', maxWidth: '26rem', margin: '0 auto', paddingBottom: '6rem' }}>

        {!bill ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <Receipt size={32} color={GOLD} strokeWidth={1.5} style={{ margin: '0 auto 1rem' }} />
            <p style={{ fontFamily: "'Cinzel', serif", color: NAVY, fontSize: '0.8rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>No bill found</p>
          </div>
        ) : (
          <>
            {/* Status badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <p style={{ fontFamily: "'Cinzel', serif", color: NAVY, fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Bill Status</p>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: statusStyle.color, background: statusStyle.bg, padding: '0.3rem 0.75rem', border: `1px solid ${statusStyle.color}30` }}>
                {statusStyle.label}
              </span>
            </div>

            {/* Pre-paid room section — non-refundable guests only */}
            {bill.prepaidAmount > 0 && (
              <div style={{ background: 'hsl(142 40% 97%)', border: '1px solid hsl(142 45% 78%)', marginBottom: '1rem', overflow: 'hidden' }}>
                <div style={{ background: 'hsl(142 45% 28%)', padding: '0.6rem 1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={13} color="#fff" strokeWidth={2} />
                  <p style={{ fontFamily: "'Cinzel', serif", color: '#fff', fontSize: '0.58rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Settled at Booking</p>
                </div>
                {bill.lineItems.filter((i: any) => i.type === 'room').map((item: any, idx: number) => (
                  <div key={idx} style={{ padding: '0.875rem 1.125rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, marginRight: '1rem' }}>
                      <p style={{ color: 'hsl(142 40% 28%)', fontSize: '0.78rem', lineHeight: 1.4 }}>{cleanDescription(item.description)}</p>
                      <p style={{ color: 'hsl(142 30% 48%)', fontSize: '0.65rem', marginTop: '0.2rem' }}>Non-refundable — paid at booking</p>
                    </div>
                    <p style={{ fontFamily: "'Cinzel', serif", color: 'hsl(142 40% 28%)', fontSize: '0.8rem', flexShrink: 0 }}>${item.amount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* In-stay charges */}
            <div style={{ background: '#fff', border: '1px solid hsl(220 15% 88%)', marginBottom: '1rem', overflow: 'hidden', boxShadow: '0 1px 8px hsl(220 55% 14% / 0.06)' }}>
              <div style={{ background: NAVY, padding: '0.75rem 1.125rem' }}>
                <p style={{ fontFamily: "'Cinzel', serif", color: GOLD, fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
                  {bill.prepaidAmount > 0 ? 'Charges Due at Checkout' : 'Charges'}
                </p>
              </div>
              {bill.lineItems.filter((i: any) => bill.prepaidAmount > 0 ? i.type !== 'room' : true).length === 0
                ? <p style={{ padding: '0.875rem 1.125rem', color: 'hsl(220 15% 58%)', fontSize: '0.75rem' }}>No additional charges yet</p>
                : bill.lineItems.filter((i: any) => bill.prepaidAmount > 0 ? i.type !== 'room' : true).map((item: any, i: number, arr: any[]) => (
                  <div key={i} style={{ padding: '0.875rem 1.125rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: i < arr.length - 1 ? '1px solid hsl(220 15% 93%)' : 'none' }}>
                    <div style={{ flex: 1, marginRight: '1rem' }}>
                      <p style={{ color: NAVY, fontSize: '0.78rem', lineHeight: 1.4 }}>{cleanDescription(item.description)}</p>
                      <p style={{ color: 'hsl(220 15% 58%)', fontSize: '0.65rem', marginTop: '0.2rem' }}>{new Date(item.date).toLocaleDateString()}</p>
                    </div>
                    <p style={{ fontFamily: "'Cinzel', serif", color: NAVY, fontSize: '0.8rem', flexShrink: 0 }}>${item.amount.toFixed(2)}</p>
                  </div>
                ))
              }
            </div>

            {/* Totals */}
            <div style={{ background: NAVY, padding: '1.5rem', border: `1px solid ${GOLD}25`, boxShadow: '0 4px 20px hsl(220 55% 14% / 0.15)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
                {([
                  ...(bill.prepaidAmount > 0 ? [] : [['Room Charges', bill.roomCharges] as [string, number]]),
                  ['Food & Beverages', bill.foodCharges],
                  ['Spa Services',     bill.spaCharges],
                  ['Other',            bill.otherCharges],
                  ['Subtotal',         bill.totalAmount],
                  ['Tax (13% VAT)',    bill.taxAmount],
                ] as [string, number][]).filter(([, v]) => Number(v) > 0).map(([lbl, amount]) => (
                  <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'Cinzel', serif", color: 'hsl(40 30% 85% / 0.5)', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{lbl}</span>
                    <span style={{ fontFamily: "'Cinzel', serif", color: 'hsl(40 30% 88%)', fontSize: '0.75rem' }}>${Number(amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0' }}>
                <div style={{ flex: 1, height: '1px', background: `linear-gradient(to right, transparent, ${GOLD}40)` }} />
                <span style={{ color: GOLD, fontSize: '0.75rem' }}>𓎛</span>
                <div style={{ flex: 1, height: '1px', background: `linear-gradient(to left, transparent, ${GOLD}40)` }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Cinzel', serif", color: 'hsl(40 30% 92%)', fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  {bill.prepaidAmount > 0 ? 'Amount Due' : 'Grand Total'}
                </span>
                <span style={{ fontFamily: "'Cinzel Decorative', serif", color: GOLD, fontSize: '1.5rem' }}>${bill.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Pay button */}
            {bill.status === 'pending_payment' && (
              <div style={{ marginTop: '1.5rem' }}>
                <button
                  onClick={handlePayment}
                  disabled={paying}
                  style={{ width: '100%', background: `linear-gradient(135deg, ${GOLD}, hsl(43 65% 68%))`, color: NAVY, fontFamily: "'Cinzel', serif", fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', padding: '1rem', border: 'none', cursor: paying ? 'not-allowed' : 'pointer', opacity: paying ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 700 }}>
                  <CreditCard size={16} strokeWidth={2} />
                  {paying ? 'Processing...' : `Pay Now — $${bill.grandTotal.toFixed(2)}`}
                </button>
                <p style={{ textAlign: 'center', fontFamily: "'Cinzel', serif", color: 'hsl(220 15% 55%)', fontSize: '0.6rem', letterSpacing: '0.1em', marginTop: '0.875rem' }}>
                  Or pay at the front desk
                </p>
              </div>
            )}

            {bill.status === 'paid' && (
              <div style={{ marginTop: '1.5rem', textAlign: 'center', padding: '1.5rem', background: 'hsl(142 60% 40% / 0.07)', border: '1px solid hsl(142 60% 40% / 0.2)' }}>
                <CheckCircle2 size={32} color="hsl(142 60% 40%)" strokeWidth={1.5} style={{ margin: '0 auto 0.75rem' }} />
                <p style={{ fontFamily: "'Cinzel', serif", color: 'hsl(142 60% 38%)', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Payment Complete</p>
                {bill.paymentMethod && (
                  <p style={{ color: 'hsl(220 15% 55%)', fontSize: '0.7rem', marginTop: '0.4rem' }}>via {bill.paymentMethod}</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
