'use client';
import React, { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../../../store/authStore';
import { A, PageHeader } from '../../_adminStyles';
import { RefreshCw } from 'lucide-react';

type Tab = 'exchange_rate' | 'discount';

const inputSt: React.CSSProperties = {
  width: '100%', padding: '0.6rem 0.75rem',
  border: `1px solid ${A.border}`, fontFamily: A.cinzel,
  fontSize: '0.78rem', color: A.navy, background: '#fff',
  outline: 'none', boxSizing: 'border-box',
};

const labelSt: React.CSSProperties = {
  display: 'block', fontFamily: A.cinzel, fontSize: '0.72rem',
  letterSpacing: '0.12em', textTransform: 'uppercase', color: A.navy,
  marginBottom: '0.4rem',
};

const sectionTitle: React.CSSProperties = {
  fontFamily: A.cinzel, fontSize: '0.75rem', letterSpacing: '0.18em',
  textTransform: 'uppercase', color: A.navy, marginBottom: '1.25rem',
  paddingBottom: '0.625rem', borderBottom: `1px solid ${A.border}`,
};

const SaveBtn = ({ onClick, busy, children }: { onClick: () => void; busy: boolean; children: React.ReactNode }) => (
  <button
    onClick={onClick} disabled={busy}
    style={{
      padding: '0.65rem 1.75rem', background: A.navy, border: 'none',
      color: A.gold, fontFamily: A.cinzel, fontSize: '0.68rem',
      letterSpacing: '0.14em', textTransform: 'uppercase', cursor: busy ? 'not-allowed' : 'pointer',
      opacity: busy ? 0.6 : 1, marginTop: '1.25rem',
    }}
  >
    {busy ? 'Saving…' : children}
  </button>
);

function ToggleRow({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: `1px solid ${A.border}` }}>
      <span style={{ fontFamily: A.cinzel, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: disabled ? A.muted : A.navy }}>
        {label}
      </span>
      <button
        onClick={() => !disabled && onChange(!checked)}
        style={{
          width: '3rem', height: '1.5rem', borderRadius: '0', border: `1px solid ${checked && !disabled ? A.gold : A.border}`,
          background: checked && !disabled ? A.gold : A.papyrus, cursor: disabled ? 'not-allowed' : 'pointer',
          position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span style={{
          position: 'absolute', top: '0.2rem',
          left: checked ? '1.4rem' : '0.25rem',
          width: '1rem', height: '1rem',
          background: checked && !disabled ? '#fff' : A.muted,
          transition: 'left 0.2s',
        }} />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = (user as any)?.role === 'super_admin';
  const [tab, setTab] = useState<Tab>('exchange_rate');

  if (!isSuperAdmin) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <p style={{ fontFamily: A.cinzel, fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: A.muted }}>
          Access Restricted
        </p>
        <p style={{ fontFamily: A.cinzel, fontSize: '0.75rem', color: A.muted, marginTop: '0.5rem' }}>
          This page is only accessible to superadmin.
        </p>
      </div>
    );
  }

  // Exchange rate state
  const [rate, setRate] = useState('');
  const [rateInfo, setRateInfo] = useState<{ updatedBy: string; updatedAt: string } | null>(null);
  const [rateBusy, setRateBusy] = useState(false);

  // Discount state
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [appliesTo, setAppliesTo] = useState({ room: true, food: true, spa: true });
  const [discountMode, setDiscountMode] = useState<'percentage' | 'cash' | null>(null);
  const [maxPct, setMaxPct] = useState('');
  const [maxCash, setMaxCash] = useState('');
  const [discountBusy, setDiscountBusy] = useState(false);

  useEffect(() => {
    api.get('/settings/exchange-rate')
      .then(({ data }) => {
        setRate(String(data.rate));
        if (data.updatedBy || data.updatedAt) {
          setRateInfo({ updatedBy: data.updatedBy, updatedAt: data.updatedAt });
        }
      })
      .catch(() => {});

    api.get('/settings/discount')
      .then(({ data }) => {
        setDiscountEnabled(data.discountEnabled);
        setAppliesTo(data.discountAppliesTo);
        setMaxPct(data.maxDiscountPercentage != null ? String(data.maxDiscountPercentage) : '0');
        setMaxCash(data.maxDiscountCash != null ? String(data.maxDiscountCash) : '0');
        if ((data.maxDiscountPercentage ?? 0) > 0) setDiscountMode('percentage');
        else if ((data.maxDiscountCash ?? 0) > 0) setDiscountMode('cash');
        else setDiscountMode(null);
      })
      .catch(() => {});
  }, []);

  const saveRate = async () => {
    if (!rate || isNaN(Number(rate)) || Number(rate) < 1) {
      toast.error('Enter a valid exchange rate (≥ 1)');
      return;
    }
    setRateBusy(true);
    try {
      const { data } = await api.patch('/settings/exchange-rate', { rate: Number(rate) });
      toast.success(`Rate updated to Rs. ${data.rate}`);
      setRateInfo({ updatedBy: data.updatedBy, updatedAt: new Date().toISOString() });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update rate');
    } finally { setRateBusy(false); }
  };

  const saveDiscount = async () => {
    const pctNum  = discountMode === 'percentage' ? Number(maxPct)  : 0;
    const cashNum = discountMode === 'cash'       ? Number(maxCash) : 0;
    if (discountMode === 'percentage' && (isNaN(pctNum) || pctNum < 1 || pctNum > 100)) {
      toast.error('Max percentage must be 1–100'); return;
    }
    if (discountMode === 'cash' && (isNaN(cashNum) || cashNum < 1)) {
      toast.error('Max cash must be at least 1'); return;
    }
    setDiscountBusy(true);
    try {
      await api.patch('/settings/discount', {
        discountEnabled,
        discountAppliesTo: appliesTo,
        maxDiscountPercentage: pctNum,
        maxDiscountCash: cashNum,
      });
      toast.success('Discount settings saved');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to save settings');
    } finally { setDiscountBusy(false); }
  };

  const tabStyle = (t: Tab): React.CSSProperties => ({
    fontFamily: A.cinzel, fontSize: '0.72rem', letterSpacing: '0.12em',
    textTransform: 'uppercase', padding: '0.65rem 1.5rem',
    background: tab === t ? A.navy : 'transparent',
    color: tab === t ? A.gold : A.muted,
    border: `1px solid ${tab === t ? A.navy : A.border}`,
    borderBottom: tab === t ? `1px solid ${A.navy}` : `1px solid ${A.border}`,
    cursor: 'pointer', marginBottom: '-1px',
  });

  return (
    <div style={{ padding: '2rem 2rem 3rem', maxWidth: '1100px' }}>
      <PageHeader eyebrow="Administration" title="Settings" />

      <div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', borderBottom: `1px solid ${A.border}`, marginBottom: '1.75rem' }}>
          <button style={tabStyle('exchange_rate')} onClick={() => setTab('exchange_rate')}>
            Exchange Rate
          </button>
          {isSuperAdmin && (
            <button style={tabStyle('discount')} onClick={() => setTab('discount')}>
              Discount Settings
            </button>
          )}
        </div>

        {/* Exchange Rate Tab */}
        {tab === 'exchange_rate' && (
          <div style={{ maxWidth: '28rem' }}>
            <p style={sectionTitle}>USD → NPR Exchange Rate</p>

            <p style={{ fontFamily: A.cinzel, fontSize: '0.78rem', color: A.muted, lineHeight: 1.7, marginBottom: '1.25rem' }}>
              Set today's USD to Nepali Rupee rate. Nepali guests see all billing amounts converted at this rate.
            </p>

            <label style={labelSt}>Rate (1 USD = ? NPR)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontFamily: A.cinzel, fontSize: '0.78rem', color: A.muted, whiteSpace: 'nowrap' }}>Rs.</span>
              <input
                type="number"
                min={1}
                step={0.5}
                style={inputSt}
                value={rate}
                onChange={e => setRate(e.target.value)}
                placeholder="135"
              />
            </div>

            {rateInfo?.updatedBy && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.75rem' }}>
                <RefreshCw size={11} color={A.muted} />
                <span style={{ fontFamily: A.cinzel, fontSize: '0.75rem', color: A.muted, letterSpacing: '0.06em' }}>
                  Last updated by {rateInfo.updatedBy}
                  {rateInfo.updatedAt ? ` on ${new Date(rateInfo.updatedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
                </span>
              </div>
            )}

            <SaveBtn onClick={saveRate} busy={rateBusy}>
              Save Rate
            </SaveBtn>
          </div>
        )}

        {/* Discount Settings Tab (superadmin only) */}
        {tab === 'discount' && isSuperAdmin && (
          <div style={{ maxWidth: '28rem' }}>
            <p style={sectionTitle}>Discount Permissions</p>

            <p style={{ fontFamily: A.cinzel, fontSize: '0.78rem', color: A.muted, lineHeight: 1.7, marginBottom: '1.25rem' }}>
              When enabled, front desk staff can apply a cash or percentage discount during billing. Choose which charge categories are eligible for discount.
            </p>

            <ToggleRow
              label="Allow front desk to give discounts"
              checked={discountEnabled}
              onChange={setDiscountEnabled}
            />

            <div style={{ marginTop: '1.25rem', marginBottom: '0.5rem' }}>
              <p style={{ ...labelSt, marginBottom: '0.2rem' }}>Discount applies to</p>
              <p style={{ fontFamily: A.cinzel, fontSize: '0.75rem', color: A.muted, marginBottom: '0.75rem' }}>
                Select which charge categories can be discounted
              </p>
            </div>

            <ToggleRow
              label="Room charges"
              checked={appliesTo.room}
              onChange={v => setAppliesTo(a => ({ ...a, room: v }))}
              disabled={!discountEnabled}
            />
            <ToggleRow
              label="Food & beverage"
              checked={appliesTo.food}
              onChange={v => setAppliesTo(a => ({ ...a, food: v }))}
              disabled={!discountEnabled}
            />
            <ToggleRow
              label="Spa services"
              checked={appliesTo.spa}
              onChange={v => setAppliesTo(a => ({ ...a, spa: v }))}
              disabled={!discountEnabled}
            />

            <div style={{ marginTop: '1.75rem' }}>
              <p style={{ ...labelSt, marginBottom: '0.2rem' }}>Discount Mode</p>
              <p style={{ fontFamily: A.cinzel, fontSize: '0.75rem', color: A.muted, marginBottom: '1rem' }}>
                Choose one mode. Front desk can only use the selected type and cannot exceed the limit.
              </p>

              {/* Mode toggle */}
              <div style={{ display: 'flex', marginBottom: '1.25rem', opacity: !discountEnabled ? 0.5 : 1 }}>
                {(['percentage', 'cash'] as const).map((mode, i) => (
                  <button
                    key={mode}
                    disabled={!discountEnabled}
                    onClick={() => {
                      setDiscountMode(mode);
                      if (mode === 'percentage') setMaxCash('0');
                      else setMaxPct('0');
                    }}
                    style={{
                      flex: 1, padding: '0.5rem',
                      fontFamily: A.cinzel, fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                      border: `1px solid ${discountMode === mode ? A.navy : A.border}`,
                      borderRight: i === 0 ? 'none' : undefined,
                      background: discountMode === mode ? A.navy : '#fff',
                      color: discountMode === mode ? A.gold : A.muted,
                      cursor: !discountEnabled ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {mode === 'percentage' ? '% Percentage' : '$ Cash'}
                  </button>
                ))}
              </div>

              {/* Single value input — shown once a mode is selected */}
              {discountMode === 'percentage' && (
                <div>
                  <label style={labelSt}>Max Percentage Allowed</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="number" min={1} max={100} step={1}
                      style={{ ...inputSt, opacity: !discountEnabled ? 0.5 : 1 }}
                      disabled={!discountEnabled}
                      value={maxPct === '0' ? '' : maxPct}
                      onChange={e => setMaxPct(e.target.value)}
                      placeholder="e.g. 20"
                    />
                    <span style={{ fontFamily: A.cinzel, fontSize: '0.75rem', color: A.muted }}>%</span>
                  </div>
                </div>
              )}
              {discountMode === 'cash' && (
                <div>
                  <label style={labelSt}>Max Cash Allowed (USD)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontFamily: A.cinzel, fontSize: '0.75rem', color: A.muted }}>$</span>
                    <input
                      type="number" min={1} step={0.5}
                      style={{ ...inputSt, opacity: !discountEnabled ? 0.5 : 1 }}
                      disabled={!discountEnabled}
                      value={maxCash === '0' ? '' : maxCash}
                      onChange={e => setMaxCash(e.target.value)}
                      placeholder="e.g. 50"
                    />
                  </div>
                </div>
              )}
              {discountMode === null && discountEnabled && (
                <p style={{ fontFamily: A.cinzel, fontSize: '0.75rem', color: 'hsl(0 60% 45%)', marginTop: '0.25rem' }}>
                  Select a mode above to allow discounts.
                </p>
              )}
            </div>

            <SaveBtn onClick={saveDiscount} busy={discountBusy}>
              Save Settings
            </SaveBtn>
          </div>
        )}
      </div>
    </div>
  );
}
