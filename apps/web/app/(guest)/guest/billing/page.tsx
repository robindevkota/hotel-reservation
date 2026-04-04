'use client';
import React, { useState } from 'react';
import { useBilling } from '../../../../hooks/useBilling';
import { useAuthStore } from '../../../../store/authStore';
import Button from '../../../../components/ui/Button';
import GoldDivider from '../../../../components/ui/GoldDivider';
import { StatusBadge } from '../../../../components/ui/Badge';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export default function BillingPage() {
  const { user } = useAuthStore();
  const { bill, loading, refetch } = useBilling(true);
  const [paying, setPaying] = useState(false);

  const handleStripePayment = async () => {
    if (!bill) return;
    setPaying(true);
    try {
      const { data } = await api.post('/payment/intent', { billId: bill._id });
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe not loaded');
      const result = await stripe.redirectToCheckout?.({
        mode: 'payment',
        lineItems: [{ price: data.priceId, quantity: 1 }],
        successUrl: window.location.origin + '/guest/billing?success=true',
        cancelUrl: window.location.origin + '/guest/billing',
      });
      // For simpler integration, use paymentIntents
      toast.success('Payment initiated — please complete in the redirect.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-lg mx-auto pb-24">
      <div className="text-center mb-6">
        <p className="font-[Cinzel] text-[#C9A84C] text-xs tracking-[0.4em] uppercase mb-1">Your Account</p>
        <h1 className="font-[Cinzel_Decorative] text-[#0D1B3E] text-2xl">Running Bill</h1>
        <GoldDivider ornament="𓎛" />
      </div>

      {!bill ? (
        <div className="text-center py-16">
          <p className="font-[Cinzel] text-[#5A6478] tracking-widest">No bill found</p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="font-[Cinzel] text-[#0D1B3E] text-xs tracking-widest uppercase">Bill Status</p>
            <StatusBadge status={bill.status} />
          </div>

          {/* Line Items */}
          <div className="bg-white border border-[#0D1B3E]/10 mb-4">
            <div className="bg-[#0D1B3E] px-4 py-2">
              <p className="font-[Cinzel] text-[#C9A84C] text-xs tracking-widest uppercase">Charges</p>
            </div>
            <div className="divide-y divide-[#0D1B3E]/5">
              {bill.lineItems.map((item: any, i: number) => (
                <div key={i} className="px-4 py-3 flex justify-between">
                  <div>
                    <p className="text-[#0D1B3E] text-sm">{item.description}</p>
                    <p className="text-[#5A6478] text-xs">{new Date(item.date).toLocaleDateString()}</p>
                  </div>
                  <p className="font-[Cinzel] text-[#0D1B3E] text-sm">${item.amount.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-[#0D1B3E] p-6 border border-[#C9A84C]/20">
            <div className="space-y-2 mb-4">
              {[
                ['Room Charges', bill.roomCharges],
                ['Food & Beverages', bill.foodCharges],
                ['Spa Services', bill.spaCharges],
                ['Other', bill.otherCharges],
                ['Subtotal', bill.totalAmount],
                ['Tax (13% VAT)', bill.taxAmount],
              ].map(([label, amount]) => (
                Number(amount) > 0 && (
                  <div key={String(label)} className="flex justify-between text-sm">
                    <span className="font-[Cinzel] text-[#F5ECD7]/60 text-xs tracking-wider uppercase">{label}</span>
                    <span className="font-[Cinzel] text-[#F5ECD7]">${Number(amount).toFixed(2)}</span>
                  </div>
                )
              ))}
            </div>
            <GoldDivider ornament="𓎛" />
            <div className="flex justify-between items-center">
              <span className="font-[Cinzel] text-[#F5ECD7] tracking-widest uppercase">Grand Total</span>
              <span className="font-[Cinzel_Decorative] text-[#C9A84C] text-2xl">${bill.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {bill.status === 'pending_payment' && (
            <div className="mt-6">
              <Button variant="primary" loading={paying} className="w-full" onClick={handleStripePayment}>
                Pay Now — ${bill.grandTotal.toFixed(2)}
              </Button>
              <p className="text-center font-[Cinzel] text-[#5A6478] text-xs mt-3 tracking-wider">
                Or pay at the front desk
              </p>
            </div>
          )}

          {bill.status === 'paid' && (
            <div className="mt-6 text-center">
              <div className="text-4xl mb-2">✓</div>
              <p className="font-[Cinzel] text-green-700 tracking-widest uppercase text-sm">Payment Complete</p>
              {bill.paymentMethod && (
                <p className="text-[#5A6478] text-xs mt-1">via {bill.paymentMethod}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
