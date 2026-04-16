import { useState, useEffect } from 'react';

export interface ActiveOffer {
  _id: string;
  title: string;
  description: string;
  roomDiscount: number;   // 0–100
  foodDiscount: number;
  spaDiscount: number;
  startDate: string;
  endDate: string;
}

let _cache: ActiveOffer | null = null;
let _fetched = false;

export function useActiveOffer() {
  const [offer, setOffer] = useState<ActiveOffer | null>(_cache);
  const [loading, setLoading] = useState(!_fetched);

  useEffect(() => {
    if (_fetched) { setOffer(_cache); setLoading(false); return; }
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    fetch(`${base}/offers/active`)
      .then(r => r.json())
      .then(data => {
        _cache = data.offer ?? null;
        _fetched = true;
        setOffer(_cache);
      })
      .catch(() => { _fetched = true; })
      .finally(() => setLoading(false));
  }, []);

  return { offer, loading };
}
