'use client';
import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import { PartyPopper, CheckCircle2, AlertTriangle } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { useActiveOffer } from '../../../hooks/useActiveOffer';
import OfferBanner from '../../../components/ui/OfferBanner';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const S = {
  gold: 'hsl(43 72% 55%)', goldLight: 'hsl(43 65% 72%)',
  navy: 'hsl(220 55% 18%)', navyLight: 'hsl(220 40% 28%)',
  cream: 'hsl(40 33% 96%)', papyrus: 'hsl(38 40% 92%)', muted: 'hsl(220 15% 40%)',
  border: 'hsl(35 25% 82%)',
  gradGold: 'linear-gradient(135deg, hsl(43 72% 55%), hsl(43 65% 72%))',
  gradNavy: 'linear-gradient(135deg, hsl(220 55% 18%), hsl(220 40% 28%))',
  divider: 'linear-gradient(90deg, transparent, hsl(43 72% 55%), transparent)',
  cinzel: "'Cinzel', serif", cormo: "'Cormorant Garamond', serif", raleway: "'Raleway', sans-serif",
};

type Step = 1 | 2 | 3 | 4 | 5;
type Policy = 'flexible' | 'non_refundable';

interface Room {
  _id: string;
  name: string;
  pricePerNight: number;
  images: string[];
  type: string;
}

const STEPS = ['Dates & Room', 'Rate', 'Guest Details', 'Payment', 'Confirmation'] as const;

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.75rem 1rem',
  border: `1px solid ${S.border}`, outline: 'none',
  fontFamily: S.raleway, fontSize: '0.88rem', color: S.navy,
  background: '#fff', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: S.cinzel, fontSize: '0.65rem',
  letterSpacing: '0.15em', textTransform: 'uppercase', color: S.navy, marginBottom: '0.5rem',
};

// ─── Stripe card form (used inside Elements provider) ─────────────────────────
// mode = 'hold'   → flexible rate: card authorized, money NOT taken
// mode = 'charge' → non-refundable: card charged immediately
function StripeCardForm({
  clientSecret,
  amount,
  mode,
  onSuccess,
  onBack,
}: {
  clientSecret: string;
  amount: number;
  mode: 'hold' | 'charge';
  onSuccess: () => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setProcessing(true);
    try {
      const card = elements.getElement(CardElement);
      if (!card) throw new Error('Card element not found');
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card },
      });
      if (error) {
        toast.error(error.message || 'Card declined. Please try another card.');
        return;
      }
      // mode=hold: status is 'requires_capture' (authorized, not charged)
      // mode=charge: status is 'succeeded' (charged immediately)
      if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'requires_capture') {
        onSuccess();
      }
    } catch {
      toast.error('Card processing failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const isHold = mode === 'hold';

  return (
    <div>
      {/* Summary bar */}
      <div style={{ background: S.navy, padding: '1.25rem 1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid hsl(43 72% 55% / 0.2)`, flexWrap: 'wrap', gap: '0.5rem' }}>
        <span style={{ fontFamily: S.cinzel, fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,236,215,0.6)' }}>
          {isHold ? 'Flexible Rate — Card Hold' : 'Non-Refundable — Charged Now'}
        </span>
        <span style={{ fontFamily: S.cinzel, fontSize: '1.25rem', color: S.gold, fontWeight: 600 }}>
          ${amount.toFixed(2)}{isHold && <span style={{ fontSize: '0.65rem', color: 'rgba(245,236,215,0.4)', marginLeft: '0.4rem' }}>(1 night hold)</span>}
        </span>
      </div>

      {/* Info banner */}
      <div style={{ background: isHold ? '#f0f9ff' : '#fff8e6', border: `1px solid ${isHold ? '#38bdf8' : S.gold}`, padding: '0.875rem 1.25rem', marginBottom: '2rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        {isHold
          ? <CheckCircle2 size={16} color="#0ea5e9" style={{ flexShrink: 0, marginTop: '2px' }} />
          : <AlertTriangle size={16} color={S.gold} style={{ flexShrink: 0, marginTop: '2px' }} />
        }
        <p style={{ fontFamily: S.raleway, fontSize: '0.82rem', color: S.navy, margin: 0 }}>
          {isHold
            ? <>Your card will be <strong>verified and held for ${amount.toFixed(2)}</strong> (1 night). <strong>You will not be charged now.</strong> The hold is released if you cancel within 48 hours of check-in. A 1-night fee applies for late cancellations or no-shows.</>
            : <>You are being charged <strong>${amount.toFixed(2)}</strong> now. This rate is <strong>non-refundable</strong> — no refund will be issued for any cancellation.</>
          }
        </p>
      </div>

      {/* Card input */}
      <div style={{ marginBottom: '2rem' }}>
        <label style={labelStyle}>Card Details</label>
        <div style={{ border: `1px solid ${S.border}`, padding: '0.875rem 1rem', background: '#fff' }}>
          <CardElement options={{
            style: {
              base: {
                fontFamily: "'Raleway', sans-serif",
                fontSize: '15px',
                color: '#0d2052',
                '::placeholder': { color: '#7a8399' },
              },
              invalid: { color: '#ef4444' },
            },
          }} />
        </div>
        <p style={{ fontFamily: S.raleway, fontSize: '0.72rem', color: S.muted, marginTop: '0.5rem' }}>
          Secured by Stripe · PCI DSS Level 1 · We never store card numbers
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button className="res-btn-secondary" onClick={onBack} disabled={processing}>← Back</button>
        <button className="res-btn-primary" onClick={handleSubmit} disabled={processing}>
          {processing
            ? 'Verifying...'
            : isHold
              ? `Authorize Hold — $${amount.toFixed(2)}`
              : `Pay $${amount.toFixed(2)} Now`
          }
        </button>
      </div>
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────
function ReserveContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { offer } = useActiveOffer();
  const [step, setStep] = useState<Step>(1);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [preSelected, setPreSelected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<any>(null);
  const [policy, setPolicy] = useState<Policy>('flexible');
  const [guestType, setGuestType] = useState<'foreign' | 'nepali'>('foreign');
  // Stripe upfront payment state
  const [clientSecret, setClientSecret] = useState('');
  const [upfrontAmount, setUpfrontAmount] = useState(0);
  // PhonePay state
  const [depositAmount, setDepositAmount] = useState(0);
  const [transactionId, setTransactionId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [merchantInfo, setMerchantInfo] = useState<any>(null);
  const [usdToNpr, setUsdToNpr] = useState<number>(135); // fallback rate

  const [form, setForm] = useState({
    checkInDate: '', checkOutDate: '', numberOfGuests: 2,
    name: '', email: '', phone: '', idProof: '', specialRequests: '',
  });
  const [unavailableRoomIds, setUnavailableRoomIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const roomId = searchParams.get('room');
    const roomName = searchParams.get('roomName');
    const price = searchParams.get('price');
    if (roomId) {
      setSelectedRoom({ _id: roomId, name: roomName || '', pricePerNight: Number(price), images: [], type: '' });
      setPreSelected(true);
    }
    api.get('/payment/exchange-rate/usd-npr').then(({ data }) => {
      if (data.rate) setUsdToNpr(data.rate);
    }).catch(() => {});
    api.get('/rooms?available=true').then(({ data }) => {
      const list: Room[] = data.rooms || [];
      setRooms(list);
      if (roomId) {
        const full = list.find(r => r._id === roomId);
        if (full) setSelectedRoom(full);
      }
    }).catch(() => {});
  }, [searchParams]);

  // Re-check availability against confirmed reservations whenever dates change
  useEffect(() => {
    if (!form.checkInDate || !form.checkOutDate) {
      setUnavailableRoomIds(new Set());
      return;
    }
    api.get(`/rooms/availability?checkIn=${form.checkInDate}&checkOut=${form.checkOutDate}`)
      .then(({ data }) => {
        const unavailable = new Set<string>(
          (data.rooms || [])
            .filter((r: any) => r.isAvailableForDates === false)
            .map((r: any) => r._id as string)
        );
        setUnavailableRoomIds(unavailable);
        // Deselect current room if it's no longer available for chosen dates
        setSelectedRoom(prev => (prev && unavailable.has(prev._id) ? null : prev));
      })
      .catch(() => {});
  }, [form.checkInDate, form.checkOutDate]);

  const nights = form.checkInDate && form.checkOutDate
    ? Math.max(0, Math.ceil((new Date(form.checkOutDate).getTime() - new Date(form.checkInDate).getTime()) / 86400000))
    : 0;

  const offerRoomMultiplier = offer?.roomDiscount ? (1 - offer.roomDiscount / 100) : 1;
  const baseTotal = selectedRoom ? nights * selectedRoom.pricePerNight : 0;
  // Apply non-refundable discount first, then offer discount on top (mirrors server logic)
  const afterPolicy = policy === 'non_refundable' ? Math.round(baseTotal * 0.9 * 100) / 100 : baseTotal;
  const totalCostUsd = Math.round(afterPolicy * offerRoomMultiplier * 100) / 100;
  // Nepali guests see NPR; foreign guests see USD
  const totalCost = guestType === 'nepali' ? Math.round(totalCostUsd * usdToNpr * 100) / 100 : totalCostUsd;
  const savings = guestType === 'nepali'
    ? Math.round(baseTotal * usdToNpr * 100) / 100 - totalCost
    : baseTotal - totalCost;
  const currencySymbol = guestType === 'nepali' ? 'NPR ' : '$';

  // Step 3 → submit reservation
  const handleSubmit = async () => {
    if (!selectedRoom)                           { toast.error('Please select a room'); return; }
    if (!form.checkInDate || !form.checkOutDate) { toast.error('Please select dates'); return; }
    if (!form.name || !form.email || !form.phone){ toast.error('Please fill guest details'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/reservations', {
        guest: { name: form.name, email: form.email, phone: form.phone, idProof: form.idProof },
        room: selectedRoom._id,
        checkInDate: form.checkInDate,
        checkOutDate: form.checkOutDate,
        numberOfGuests: form.numberOfGuests,
        specialRequests: form.specialRequests,
        cancellationPolicy: guestType === 'nepali' ? 'non_refundable' : policy,
        guestType,
      });
      setConfirmation(data.reservation);

      if (guestType === 'nepali') {
        // Fetch merchant info and go to PhonePay step
        const { data: info } = await api.get('/payment/phonepay/merchant-info');
        setMerchantInfo(info);
        setDepositAmount(data.depositAmount);
        setStep(4);
      } else {
        // Stripe flow
        const endpoint = policy === 'non_refundable' ? '/payment/upfront' : '/payment/authorize';
        const { data: payData } = await api.post(endpoint, { reservationId: data.reservation._id });
        setClientSecret(payData.clientSecret);
        setUpfrontAmount(payData.amount);
        setStep(4);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create reservation');
    } finally {
      setLoading(false);
    }
  };

  // PhonePay deposit verification
  const handlePhonePayVerify = async () => {
    if (!transactionId.trim()) { toast.error('Please enter your transaction ID'); return; }
    if (!confirmation) return;
    setVerifying(true);
    try {
      await api.post('/payment/phonepay/verify', {
        reservationId: confirmation._id,
        transactionId: transactionId.trim(),
      });
      toast.success('Payment verified! Booking confirmed.');
      setStep(5);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `.res-input:focus{border-color:hsl(43 72% 55%)!important;}.room-sel{background:#fff;border:2px solid hsl(35 25% 82%);overflow:hidden;cursor:pointer;transition:border-color 0.3s,box-shadow 0.3s;text-align:left;}.room-sel:hover{border-color:hsl(43 72% 55%/0.5);}.room-sel.active{border-color:hsl(43 72% 55%);box-shadow:0 0 0 3px hsl(43 72% 55%/0.15);}.room-sel-img{transition:transform 0.7s ease;}.room-sel:hover .room-sel-img{transform:scale(1.05);}.res-btn-primary{background:linear-gradient(135deg,hsl(43 72% 55%),hsl(43 65% 72%));color:hsl(220 55% 18%);font-family:'Cinzel',serif;font-size:0.72rem;letter-spacing:0.2em;text-transform:uppercase;padding:0.875rem 2.5rem;border:none;cursor:pointer;font-weight:600;transition:opacity 0.2s;}.res-btn-primary:hover{opacity:0.88;}.res-btn-primary:disabled{opacity:0.5;cursor:not-allowed;}.res-btn-secondary{background:transparent;color:hsl(220 15% 40%);font-family:'Cinzel',serif;font-size:0.72rem;letter-spacing:0.2em;text-transform:uppercase;padding:0.875rem 2rem;border:1px solid hsl(35 25% 82%);cursor:pointer;transition:border-color 0.2s,color 0.2s;}.res-btn-secondary:hover{border-color:hsl(43 72% 55%/0.4);color:hsl(220 55% 18%);}.res-btn-secondary:disabled{opacity:0.4;cursor:not-allowed;}.policy-card{border:2px solid hsl(35 25% 82%);background:#fff;cursor:pointer;transition:border-color 0.25s,box-shadow 0.25s;padding:1.75rem;position:relative;}.policy-card:hover{border-color:hsl(43 72% 55%/0.5);}.policy-card.selected{border-color:hsl(43 72% 55%);box-shadow:0 0 0 3px hsl(43 72% 55%/0.12);}.policy-radio{width:1.125rem;height:1.125rem;border-radius:50%;border:2px solid hsl(35 25% 82%);display:inline-flex;align-items:center;justify-content:center;transition:border-color 0.2s;flex-shrink:0;}.policy-card.selected .policy-radio{border-color:hsl(43 72% 55%);}.policy-radio-inner{width:0.55rem;height:0.55rem;border-radius:50%;background:hsl(43 72% 55%);opacity:0;}.policy-card.selected .policy-radio-inner{opacity:1;}.discount-badge{background:linear-gradient(135deg,hsl(43 72% 55%),hsl(43 65% 72%));color:hsl(220 55% 18%);font-family:'Cinzel',serif;font-size:0.6rem;letter-spacing:0.12em;padding:0.25rem 0.625rem;font-weight:700;position:absolute;top:1rem;right:1rem;}@media(max-width:640px){.policy-grid{grid-template-columns:1fr!important;}}` }} />

      <div style={{ minHeight: '100vh', background: S.cream }}>
        {/* Header */}
        <div style={{ position: 'relative', background: S.navy, padding: '9rem 1.5rem 4rem', textAlign: 'center', overflow: 'hidden' }}>
          <Image src="/hero-bg.jpg" alt="" fill sizes="100vw" style={{ objectFit: 'cover', opacity: 0.15 }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontFamily: S.cormo, color: S.gold, fontSize: '1rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Begin Your Stay</p>
            <h1 style={{ fontFamily: S.cinzel, fontWeight: 600, fontSize: 'clamp(1.8rem, 4vw, 3rem)', color: S.goldLight, marginBottom: '1.5rem' }}>Reserve Your Chamber</h1>
            <div style={{ width: '6rem', height: '1px', background: S.divider, margin: '0 auto 2rem' }} />

            {/* Step indicator */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {STEPS.map((label, i) => {
                const stepNum = i + 1;
                const isPaymentStep = label === 'Payment';
                // Hide Payment step circle for flexible policy
                if (isPaymentStep && policy === 'flexible') return null;
                // Map visual step to actual step state
                const effectiveStep = isPaymentStep ? 4 : policy === 'flexible' && stepNum >= 4 ? stepNum - 1 : stepNum;
                const active = step === effectiveStep;
                const done = step > effectiveStep;
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    {i > 0 && (policy === 'flexible' && i === 4 ? null : (
                      <div style={{ width: '2rem', height: '1px', background: done ? S.gold : 'rgba(245,236,215,0.15)' }} />
                    ))}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{
                        width: '1.875rem', height: '1.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: S.cinzel, fontSize: '0.78rem', fontWeight: 600,
                        background: done ? S.gradGold : active ? S.gradGold : 'transparent',
                        color: done || active ? S.navy : 'rgba(245,236,215,0.3)',
                        border: done || active ? 'none' : '1px solid rgba(245,236,215,0.2)',
                        transition: 'all 0.3s',
                      }}>
                        {done ? '✓' : stepNum}
                      </div>
                      <span style={{
                        fontFamily: S.cinzel, fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                        color: active ? S.gold : 'rgba(245,236,215,0.3)',
                      }}>{label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <OfferBanner filter="room" />

        <div style={{ maxWidth: '52rem', margin: '0 auto', padding: '3rem 1.5rem' }}>

          {/* ── Step 1: Dates & Room ── */}
          {step === 1 && (
            <div>
              {/* Guest Type Toggle */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                {(['foreign', 'nepali'] as const).map((type) => (
                  <button key={type} onClick={() => setGuestType(type)}
                    style={{ padding: '1rem', border: `2px solid ${guestType === type ? S.gold : S.border}`, background: guestType === type ? `hsl(43 72% 55% / 0.08)` : '#fff', cursor: 'pointer', textAlign: 'left', boxShadow: guestType === type ? `0 0 0 3px hsl(43 72% 55% / 0.12)` : 'none', transition: 'all 0.2s' }}>
                    <p style={{ fontFamily: S.cinzel, fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: S.navy, marginBottom: '0.25rem' }}>
                      {type === 'foreign' ? '🌍 Foreign Guest' : '🇳🇵 Nepali Guest'}
                    </p>
                    <p style={{ fontFamily: S.raleway, fontSize: '0.72rem', color: S.muted }}>
                      {type === 'foreign' ? 'Pay via Credit/Debit Card (Stripe)' : 'Pay 50% deposit via PhonePay'}
                    </p>
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={labelStyle}>Check-In Date</label>
                  <input type="date" className="res-input" style={inputStyle}
                    value={form.checkInDate} min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setForm({ ...form, checkInDate: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Check-Out Date</label>
                  <input type="date" className="res-input" style={inputStyle}
                    value={form.checkOutDate}
                    min={form.checkInDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setForm({ ...form, checkOutDate: e.target.value })} />
                </div>
              </div>
              <div style={{ marginBottom: '2.5rem', maxWidth: '18rem' }}>
                <label style={labelStyle}>Number of Guests</label>
                <input type="number" className="res-input" style={inputStyle}
                  min={1} max={4} value={form.numberOfGuests}
                  onChange={(e) => setForm({ ...form, numberOfGuests: Number(e.target.value) })} />
              </div>

              <div style={{ width: '100%', height: '1px', background: S.divider, marginBottom: '2rem' }} />

              {preSelected && selectedRoom ? (
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', background: '#fff', border: `2px solid ${S.gold}`, padding: '1rem 1.25rem', marginBottom: '2rem', boxShadow: `0 0 0 3px hsl(43 72% 55% / 0.12)` }}>
                  {selectedRoom.images?.[0] && (
                    <div style={{ position: 'relative', width: '6rem', height: '4.5rem', flexShrink: 0, overflow: 'hidden' }}>
                      <Image src={selectedRoom.images[0]} alt={selectedRoom.name} fill sizes="96px" style={{ objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: S.cinzel, fontSize: '0.88rem', color: S.navy, marginBottom: '0.25rem' }}>{selectedRoom.name}</p>
                    <p style={{ fontFamily: S.raleway, fontSize: '0.75rem', color: S.muted, textTransform: 'capitalize' }}>{selectedRoom.type} · ${selectedRoom.pricePerNight}/night</p>
                  </div>
                  <div style={{ background: S.gradGold, color: S.navy, width: '1.75rem', height: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>✓</div>
                </div>
              ) : (
                <>
                  <h2 style={{ fontFamily: S.cinzel, fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: S.navy, marginBottom: '1.5rem' }}>Select Your Chamber</h2>
                  {rooms.length === 0 ? (
                    <p style={{ fontFamily: S.raleway, color: S.muted, fontSize: '0.85rem', textAlign: 'center', padding: '3rem 0' }}>Loading available rooms...</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                      {rooms.map((room) => {
                        const booked = unavailableRoomIds.has(room._id);
                        return (
                        <button key={room._id}
                          className={`room-sel${selectedRoom?._id === room._id ? ' active' : ''}`}
                          onClick={() => !booked && setSelectedRoom(room)}
                          disabled={booked}
                          style={{ width: '100%', opacity: booked ? 0.45 : 1, cursor: booked ? 'not-allowed' : 'pointer', position: 'relative' }}>
                          <div style={{ position: 'relative', height: '10rem', overflow: 'hidden' }}>
                            <Image src={room.images?.[0] || '/room-deluxe.jpg'} alt={room.name} fill sizes="(max-width:768px) 100vw, 280px" className="room-sel-img" style={{ objectFit: 'cover' }} />
                            {selectedRoom?._id === room._id && (
                              <div style={{ position: 'absolute', top: '0.625rem', right: '0.625rem', background: S.gradGold, color: S.navy, width: '1.75rem', height: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>✓</div>
                            )}
                            {booked && (
                              <div style={{ position: 'absolute', inset: 0, background: 'hsl(220 55% 10% / 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontFamily: S.cinzel, fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#fff', background: 'hsl(0 55% 42% / 0.85)', padding: '0.3rem 0.75rem' }}>Unavailable</span>
                              </div>
                            )}
                          </div>
                          <div style={{ padding: '0.875rem 1rem' }}>
                            <p style={{ fontFamily: S.cinzel, fontSize: '0.78rem', color: S.navy, marginBottom: '0.35rem' }}>{room.name}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontFamily: S.raleway, fontSize: '0.7rem', color: S.muted, textTransform: 'capitalize' }}>{room.type}</span>
                              <span style={{ fontFamily: S.cinzel, fontSize: '0.85rem', color: booked ? S.muted : S.gold }}>
                                {booked ? 'Booked' : `${currencySymbol}${Math.round(room.pricePerNight * offerRoomMultiplier * (guestType === 'nepali' ? usdToNpr : 1) * 100) / 100}`}
                                {!booked && offerRoomMultiplier < 1 && <span style={{ fontSize: '0.6rem', color: S.muted, textDecoration: 'line-through', marginLeft: '0.3rem' }}>{currencySymbol}{Math.round(room.pricePerNight * (guestType === 'nepali' ? usdToNpr : 1))}</span>}
                                {!booked && <span style={{ fontSize: '0.65rem', color: S.muted }}>/night</span>}
                              </span>
                            </div>
                          </div>
                        </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {selectedRoom && nights > 0 && (
                <div style={{ background: S.navy, padding: '1.25rem 1.5rem', border: `1px solid hsl(43 72% 55% / 0.2)`, marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: S.cinzel, fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,236,215,0.6)' }}>
                    {selectedRoom.name} × {nights} night{nights !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontFamily: S.cinzel, fontSize: '1.25rem', color: S.gold, fontWeight: 600 }}>{currencySymbol}{guestType === 'nepali' ? Math.round(baseTotal * usdToNpr).toLocaleString() : baseTotal.toLocaleString()}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="res-btn-primary" onClick={() => {
                  if (!selectedRoom)                           { toast.error('Please select a room'); return; }
                  if (!form.checkInDate || !form.checkOutDate) { toast.error('Please select dates'); return; }
                  // Nepali guests skip rate selection (always non-refundable 50% deposit)
                  setStep(guestType === 'nepali' ? 3 : 2);
                }}>Continue →</button>
              </div>
            </div>
          )}

          {/* ── Step 2: Rate / Policy Selection ── */}
          {step === 2 && (
            <div>
              {/* Summary bar */}
              <div style={{ background: S.navy, padding: '1rem 1.5rem', border: `1px solid hsl(43 72% 55% / 0.2)`, marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: S.cinzel, fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,236,215,0.6)' }}>
                  {selectedRoom?.name} · {nights} night{nights !== 1 ? 's' : ''}
                </span>
                <span style={{ fontFamily: S.cinzel, fontSize: '1.1rem', color: S.gold, fontWeight: 600 }}>${baseTotal.toLocaleString()}</span>
              </div>

              <h2 style={{ fontFamily: S.cinzel, fontSize: '0.72rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: S.navy, marginBottom: '0.625rem' }}>Select Your Rate</h2>
              <p style={{ fontFamily: S.cormo, fontStyle: 'italic', color: S.muted, fontSize: '1rem', marginBottom: '2rem' }}>
                Choose the rate that suits your plans.
              </p>

              <div className="policy-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2.5rem' }}>

                {/* Flexible */}
                <button
                  className={`policy-card${policy === 'flexible' ? ' selected' : ''}`}
                  onClick={() => setPolicy('flexible')}
                  style={{ textAlign: 'left', width: '100%' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', marginBottom: '1.25rem' }}>
                    <div className="policy-radio"><div className="policy-radio-inner" /></div>
                    <div>
                      <p style={{ fontFamily: S.cinzel, fontSize: '0.82rem', color: S.navy, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Flexible Rate</p>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                        <p style={{ fontFamily: S.cinzel, fontSize: '1.4rem', color: S.gold, fontWeight: 600, lineHeight: 1 }}>
                          ${Math.round(selectedRoom!.pricePerNight * offerRoomMultiplier * 100) / 100}<span style={{ fontSize: '0.7rem', color: S.muted, fontWeight: 400 }}>/night</span>
                        </p>
                        {offerRoomMultiplier < 1 && <span style={{ fontFamily: S.raleway, fontSize: '0.72rem', color: S.muted, textDecoration: 'line-through' }}>${selectedRoom!.pricePerNight}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: '1px', background: S.divider, marginBottom: '1rem' }} />
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[
                      { icon: '✓', text: 'Free cancellation up to 48h before check-in', ok: true },
                      { icon: '✓', text: 'Card held for 1 night — not charged now', ok: true },
                      { icon: '✓', text: '1-night fee only if cancelled late or no-show', ok: true },
                    ].map(({ icon, text, ok }) => (
                      <li key={text} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                        <span style={{ color: ok ? '#22c55e' : S.muted, fontWeight: 700, fontSize: '0.75rem', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
                        <span style={{ fontFamily: S.raleway, fontSize: '0.78rem', color: S.muted, lineHeight: 1.4 }}>{text}</span>
                      </li>
                    ))}
                  </ul>
                  <div style={{ marginTop: '1.25rem', padding: '0.625rem 0.875rem', background: 'hsl(220 55% 18% / 0.06)', fontFamily: S.cinzel, fontSize: '0.82rem', color: S.navy, textAlign: 'center' }}>
                    Total: ${baseTotal.toLocaleString()}
                  </div>
                </button>

                {/* Non-Refundable */}
                <button
                  className={`policy-card${policy === 'non_refundable' ? ' selected' : ''}`}
                  onClick={() => setPolicy('non_refundable')}
                  style={{ textAlign: 'left', width: '100%' }}
                >
                  <div className="discount-badge">SAVE 10%</div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', marginBottom: '1.25rem' }}>
                    <div className="policy-radio"><div className="policy-radio-inner" /></div>
                    <div>
                      <p style={{ fontFamily: S.cinzel, fontSize: '0.82rem', color: S.navy, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Non-Refundable</p>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                        <p style={{ fontFamily: S.cinzel, fontSize: '1.4rem', color: S.gold, fontWeight: 600, lineHeight: 1 }}>
                          ${Math.round(selectedRoom!.pricePerNight * 0.9 * offerRoomMultiplier * 100) / 100}<span style={{ fontSize: '0.7rem', color: S.muted, fontWeight: 400 }}>/night</span>
                        </p>
                        <p style={{ fontFamily: S.raleway, fontSize: '0.72rem', color: S.muted, textDecoration: 'line-through' }}>${selectedRoom!.pricePerNight}</p>
                      </div>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: '1px', background: S.divider, marginBottom: '1rem' }} />
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[
                      { icon: '✓', text: '10% discount applied immediately', ok: true },
                      { icon: '✓', text: 'Charged in full right now via Stripe', ok: true },
                      { icon: '✗', text: 'No refund on cancellation', ok: false },
                    ].map(({ icon, text, ok }) => (
                      <li key={text} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                        <span style={{ color: ok ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
                        <span style={{ fontFamily: S.raleway, fontSize: '0.78rem', color: S.muted, lineHeight: 1.4 }}>{text}</span>
                      </li>
                    ))}
                  </ul>
                  <div style={{ marginTop: '1.25rem', padding: '0.625rem 0.875rem', background: `hsl(43 72% 55% / 0.08)`, border: `1px solid hsl(43 72% 55% / 0.2)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: S.cinzel, fontSize: '0.82rem', color: S.navy }}>Total:</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontFamily: S.cinzel, fontSize: '0.88rem', color: S.gold, fontWeight: 600 }}>${totalCost.toFixed(2)}</span>
                      {savings > 0 && <span style={{ fontFamily: S.raleway, fontSize: '0.68rem', color: '#22c55e', display: 'block' }}>You save ${savings.toFixed(2)}</span>}
                    </div>
                  </div>
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="res-btn-secondary" onClick={() => setStep(1)}>← Back</button>
                <button className="res-btn-primary" onClick={() => setStep(3)}>Continue →</button>
              </div>
            </div>
          )}

          {/* ── Step 3: Guest Details ── */}
          {step === 3 && (
            <div>
              <div style={{ background: S.navy, padding: '1rem 1.5rem', border: `1px solid hsl(43 72% 55% / 0.2)`, marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontFamily: S.cinzel, fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,236,215,0.6)' }}>
                  {selectedRoom?.name} · {nights} night{nights !== 1 ? 's' : ''} · {guestType === 'nepali' ? 'PhonePay Deposit' : policy === 'non_refundable' ? 'Non-Refundable' : 'Flexible'}
                </span>
                <span style={{ fontFamily: S.cinzel, fontSize: '1.1rem', color: S.gold, fontWeight: 600 }}>
                  {currencySymbol}{totalCost.toFixed(2)}
                  {guestType === 'foreign' && policy === 'non_refundable' && <span style={{ fontSize: '0.65rem', color: '#22c55e', marginLeft: '0.5rem' }}>10% OFF</span>}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input className="res-input" style={inputStyle} placeholder="As on ID"
                    value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" className="res-input" style={inputStyle}
                    value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input type="tel" className="res-input" style={inputStyle}
                    value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>ID / Passport (optional)</label>
                  <input className="res-input" style={inputStyle}
                    value={form.idProof} onChange={(e) => setForm({ ...form, idProof: e.target.value })} />
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={labelStyle}>Special Requests</label>
                <textarea className="res-input" style={{ ...inputStyle, resize: 'none' }} rows={3}
                  placeholder="Dietary requirements, room preferences, celebrations..."
                  value={form.specialRequests} onChange={(e) => setForm({ ...form, specialRequests: e.target.value })} />
              </div>

              {/* Policy reminder before payment step */}
              {guestType === 'nepali' ? (
                <div style={{ background: '#fff8e6', border: `1px solid ${S.gold}`, padding: '0.875rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <AlertTriangle size={16} color={S.gold} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ fontFamily: S.raleway, fontSize: '0.82rem', color: S.navy, margin: 0 }}>
                    A <strong>50% deposit</strong> of <strong>NPR {Math.round(totalCost * 0.5 * 100) / 100}</strong> is required via PhonePay to confirm your booking. The remaining 50% is due at check-in. <strong>Deposit is non-refundable.</strong>
                  </p>
                </div>
              ) : policy === 'flexible' ? (
                <div style={{ background: '#f0f9ff', border: '1px solid #38bdf8', padding: '0.875rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <CheckCircle2 size={16} color="#0ea5e9" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ fontFamily: S.raleway, fontSize: '0.82rem', color: S.navy, margin: 0 }}>
                    Your card will be <strong>verified and held for 1 night (${selectedRoom?.pricePerNight})</strong>. You will <strong>not be charged now</strong>. The hold is released on normal cancellation within 48 hours.
                  </p>
                </div>
              ) : (
                <div style={{ background: '#fff8e6', border: `1px solid ${S.gold}`, padding: '0.875rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <AlertTriangle size={16} color={S.gold} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ fontFamily: S.raleway, fontSize: '0.82rem', color: S.navy, margin: 0 }}>
                    You have selected a <strong>non-refundable</strong> rate. You will be charged <strong>${totalCost.toFixed(2)}</strong> immediately on the next step. No refund will be issued for cancellations.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="res-btn-secondary" onClick={() => setStep(guestType === 'nepali' ? 1 : 2)}>← Back</button>
                <button className="res-btn-primary" disabled={loading} onClick={handleSubmit}>
                  {loading ? 'Processing...' : guestType === 'nepali' ? 'Continue to PhonePay →' : 'Continue to Card →'}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: PhonePay deposit (Nepali guests) ── */}
          {step === 4 && guestType === 'nepali' && merchantInfo && (
            <div>
              {/* Amount bar */}
              <div style={{ background: S.navy, padding: '1.25rem 1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: `1px solid hsl(43 72% 55% / 0.2)`, flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontFamily: S.cinzel, fontSize: '0.68rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,236,215,0.6)' }}>50% Deposit — PhonePay</span>
                <span style={{ fontFamily: S.cinzel, fontSize: '1.25rem', color: S.gold, fontWeight: 600 }}>NPR {depositAmount.toFixed(2)}</span>
              </div>

              {/* Info banner */}
              <div style={{ background: '#fff8e6', border: `1px solid ${S.gold}`, padding: '0.875rem 1.25rem', marginBottom: '2rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <AlertTriangle size={16} color={S.gold} style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontFamily: S.raleway, fontSize: '0.82rem', color: S.navy, margin: 0 }}>
                  Pay <strong>NPR {depositAmount.toFixed(2)}</strong> (50% deposit) via PhonePay to confirm your booking. The remaining 50% is due at check-in. <strong>Deposit is non-refundable.</strong>
                </p>
              </div>

              {/* Merchant info */}
              <div style={{ background: '#fff', border: `1px solid ${S.border}`, padding: '1.5rem', marginBottom: '2rem', textAlign: 'center' }}>
                <p style={{ fontFamily: S.cinzel, fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: S.muted, marginBottom: '0.75rem' }}>Send Payment To</p>
                <p style={{ fontFamily: S.cinzel, fontSize: '1.5rem', color: S.navy, fontWeight: 700, marginBottom: '0.25rem' }}>{merchantInfo.merchantPhone}</p>
                <p style={{ fontFamily: S.raleway, fontSize: '0.82rem', color: S.muted, marginBottom: '0.5rem' }}>{merchantInfo.merchantName}</p>
                <p style={{ fontFamily: S.cinzel, fontSize: '0.72rem', color: S.gold }}>Amount: NPR {depositAmount.toFixed(2)}</p>
                {merchantInfo.isMock && (
                  <div style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'hsl(200 80% 95%)', border: '1px solid hsl(200 80% 70%)', fontFamily: S.raleway, fontSize: '0.75rem', color: 'hsl(200 60% 35%)' }}>
                    🧪 Test mode — use transaction ID starting with <strong>TEST</strong> (e.g. TEST123456)
                  </div>
                )}
              </div>

              {/* Transaction ID input */}
              <div style={{ marginBottom: '2rem' }}>
                <label style={labelStyle}>PhonePay Transaction ID</label>
                <input className="res-input" style={inputStyle} placeholder="e.g. TEST123456 or your PhonePay transaction ID"
                  value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
                <p style={{ fontFamily: S.raleway, fontSize: '0.72rem', color: S.muted, marginTop: '0.5rem' }}>
                  Find the transaction ID in your PhonePay app after payment.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="res-btn-secondary" onClick={() => setStep(3)} disabled={verifying}>← Back</button>
                <button className="res-btn-primary" onClick={handlePhonePayVerify} disabled={verifying}>
                  {verifying ? 'Verifying...' : 'Verify & Confirm Booking'}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Card step (foreign guests — Stripe) ── */}
          {/* Elements is mounted once when clientSecret arrives and stays mounted   */}
          {/* so the Stripe iframe never gets destroyed and recreated on re-renders  */}
          {clientSecret && (
            <div style={{ display: step === 4 && guestType === 'foreign' ? 'block' : 'none' }}>
              <Elements stripe={stripePromise}>
                <StripeCardForm
                  clientSecret={clientSecret}
                  amount={upfrontAmount}
                  mode={policy === 'flexible' ? 'hold' : 'charge'}
                  onSuccess={() => setStep(5)}
                  onBack={() => setStep(3)}
                />
              </Elements>
            </div>
          )}

          {/* ── Step 5: Confirmation ── */}
          {step === 5 && confirmation && (
            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'center', color: S.gold, marginBottom: '1rem' }}>
                <PartyPopper size={56} strokeWidth={1.2} />
              </div>
              <h2 style={{ fontFamily: S.cinzel, fontWeight: 600, fontSize: 'clamp(1.5rem, 3vw, 2.2rem)', color: S.navy, marginBottom: '0.75rem' }}>
                {guestType === 'nepali' ? 'Deposit Verified — Booking Confirmed' : policy === 'non_refundable' ? 'Booking Paid & Confirmed' : 'Reservation Confirmed'}
              </h2>
              <div style={{ width: '6rem', height: '1px', background: S.divider, margin: '1.25rem auto' }} />
              <p style={{ fontFamily: S.cormo, fontStyle: 'italic', color: S.muted, fontSize: '1.1rem', marginBottom: '2.5rem' }}>
                A confirmation has been sent to <strong>{form.email}</strong>
              </p>

              <div style={{ background: S.navy, padding: '2rem', border: `1px solid hsl(43 72% 55% / 0.2)`, maxWidth: '30rem', margin: '0 auto 2.5rem', textAlign: 'left' }}>
                {(guestType === 'nepali' ? [
                  ['Booking Reference', confirmation.bookingRef],
                  ['Room',             selectedRoom?.name],
                  ['Check-In',         new Date(form.checkInDate).toDateString()],
                  ['Check-Out',        new Date(form.checkOutDate).toDateString()],
                  ['Nights',           String(nights)],
                  ['Rate',             'Non-Refundable (Nepali Guest)'],
                  ['Total',            `NPR ${totalCost.toFixed(2)}`],
                  ['Deposit Paid',     `NPR ${depositAmount.toFixed(2)} via PhonePay`],
                  ['Balance Due',      `NPR ${(totalCost - depositAmount).toFixed(2)} at check-in`],
                ] : [
                  ['Booking Reference', confirmation.bookingRef],
                  ['Room',             selectedRoom?.name],
                  ['Check-In',         new Date(form.checkInDate).toDateString()],
                  ['Check-Out',        new Date(form.checkOutDate).toDateString()],
                  ['Nights',           String(nights)],
                  ['Rate',             policy === 'non_refundable' ? 'Non-Refundable (10% off)' : 'Flexible'],
                  ['Total',            `$${totalCost.toFixed(2)}`],
                  ['Payment',          policy === 'non_refundable' ? 'Paid in full' : `Card held — $${selectedRoom ? selectedRoom.pricePerNight : 0} (pay balance at checkout)`],
                ]).map(([k, v]) => (
                  <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid hsl(43 72% 55% / 0.1)', paddingBottom: '0.625rem', marginBottom: '0.625rem', gap: '1rem' }}>
                    <span style={{ fontFamily: S.cinzel, fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,236,215,0.45)', flexShrink: 0 }}>{k}</span>
                    <span style={{ fontFamily: S.cinzel, fontSize: '0.82rem', color: k === 'Booking Reference' ? S.gold : 'rgba(245,236,215,0.85)', fontWeight: k === 'Booking Reference' ? 700 : 400, textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>

              {guestType === 'foreign' && policy === 'flexible' && (
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem', maxWidth: '28rem', margin: '0 auto 2rem' }}>
                  <CheckCircle2 size={16} color="#22c55e" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ fontFamily: S.raleway, fontSize: '0.82rem', color: S.muted, textAlign: 'left' }}>
                    Your card is held for 1 night — <strong>not charged</strong>. Free cancellation until 48 hours before check-in. The hold is released automatically on normal cancellation.
                  </p>
                </div>
              )}

              <button className="res-btn-primary" onClick={() => router.push('/')}>Return Home</button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

export default function ReservePage() {
  return (
    <Suspense fallback={null}>
      <ReserveContent />
    </Suspense>
  );
}
