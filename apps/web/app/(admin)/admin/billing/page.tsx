'use client';
import React, { useEffect, useState } from 'react';
import api from '../../../../lib/api';
import GoldDivider from '../../../../components/ui/GoldDivider';
import { StatusBadge } from '../../../../components/ui/Badge';
import Modal from '../../../../components/ui/Modal';
import Input from '../../../../components/ui/Input';
import Button from '../../../../components/ui/Button';
import toast from 'react-hot-toast';

export default function AdminBillingPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [chargeForm, setChargeForm] = useState({ description: '', amount: '' });
  const [paying, setPaying] = useState(false);

  const fetch = () => {
    api.get('/reservations?status=checked_in').then(({ data }) => {
      setReservations(data.reservations);
      setLoading(false);
    });
  };

  useEffect(() => { fetch(); }, []);

  const viewBill = async (guestId: string) => {
    const { data } = await api.get(`/billing/${guestId}`);
    setSelectedBill(data.bill);
  };

  const handleAddCharge = async (guestId: string) => {
    if (!chargeForm.description || !chargeForm.amount) { toast.error('Fill all fields'); return; }
    try {
      await api.post(`/billing/${guestId}/add`, { description: chargeForm.description, amount: Number(chargeForm.amount) });
      toast.success('Charge added');
      setChargeForm({ description: '', amount: '' });
      viewBill(guestId);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const markCash = async (billId: string) => {
    setPaying(true);
    try {
      await api.post('/payment/cash', { billId });
      toast.success('Marked as cash payment');
      setSelectedBill(null);
      fetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="font-[Cinzel] text-[#C9A84C] text-xs tracking-[0.4em] uppercase mb-1">Billing</p>
        <h1 className="font-[Cinzel_Decorative] text-[#0D1B3E] text-3xl">Guest Bills</h1>
        <GoldDivider ornament="𓎛" />
      </div>

      <div className="bg-white border border-[#0D1B3E]/10 overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-[#0D1B3E]">
            <tr>
              {['Guest', 'Room', 'Check-Out', 'Status', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-[Cinzel] text-[#C9A84C] text-[10px] tracking-widest uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#0D1B3E]/5">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8"><div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
            ) : reservations.map((r: any) => (
              <tr key={r._id} className="hover:bg-[#F5ECD7]">
                <td className="px-4 py-3 font-[Cinzel] text-[#0D1B3E] text-xs">{r.guest?.name}</td>
                <td className="px-4 py-3 text-[#5A6478] text-xs">{r.room?.name}</td>
                <td className="px-4 py-3 text-[#5A6478] text-xs">{new Date(r.checkOutDate).toLocaleDateString()}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3">
                  <button onClick={() => viewBill(r._id)} className="font-[Cinzel] text-[9px] tracking-wider uppercase text-blue-700 border border-blue-200 px-2 py-1 hover:bg-blue-50">View Bill</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bill Modal */}
      <Modal open={!!selectedBill} onClose={() => setSelectedBill(null)} title="Guest Bill" className="max-w-lg">
        {selectedBill && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <span className="font-[Cinzel] text-[#0D1B3E] text-xs tracking-widest uppercase">Bill Status</span>
              <StatusBadge status={selectedBill.status} />
            </div>
            <div className="bg-[#F5ECD7] p-4 mb-4 space-y-1">
              {selectedBill.lineItems?.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-[#5A6478]">{item.description}</span>
                  <span className="font-[Cinzel] text-[#0D1B3E]">${item.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <GoldDivider />
            <div className="flex justify-between items-center mb-4">
              <span className="font-[Cinzel] text-[#0D1B3E] tracking-wider uppercase text-sm">Grand Total</span>
              <span className="font-[Cinzel_Decorative] text-[#C9A84C] text-2xl">${selectedBill.grandTotal?.toFixed(2)}</span>
            </div>

            {selectedBill.status === 'open' && (
              <div className="border-t border-[#0D1B3E]/10 pt-4 space-y-3">
                <p className="font-[Cinzel] text-[#0D1B3E] text-xs tracking-widest uppercase">Add Manual Charge</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Description" value={chargeForm.description} onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })} />
                  <Input label="Amount ($)" type="number" value={chargeForm.amount} onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })} />
                </div>
                <Button variant="secondary" size="sm" onClick={() => handleAddCharge(selectedBill.guest?._id)}>Add Charge</Button>
              </div>
            )}

            {selectedBill.status === 'pending_payment' && (
              <Button variant="primary" loading={paying} className="w-full mt-4" onClick={() => markCash(selectedBill._id)}>
                Mark as Cash Payment
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
