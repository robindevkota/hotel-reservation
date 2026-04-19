/**
 * USD → NPR exchange rate — admin-managed via DB.
 * Falls back to 135 if no rate has been set yet.
 */
import ExchangeRate from '../models/ExchangeRate';

const FALLBACK_RATE = 135;

export async function getUsdToNprRate(): Promise<number> {
  const record = await ExchangeRate.findOne().sort({ updatedAt: -1 });
  return record ? record.usdToNpr : FALLBACK_RATE;
}

export async function getUsdToNprRateFull(): Promise<{ rate: number; updatedBy: string; updatedAt: string }> {
  const record = await ExchangeRate.findOne().sort({ updatedAt: -1 });
  return record
    ? { rate: record.usdToNpr, updatedBy: record.updatedBy, updatedAt: record.updatedAt.toISOString() }
    : { rate: FALLBACK_RATE, updatedBy: '', updatedAt: '' };
}

export async function setUsdToNprRate(rate: number, updatedBy: string): Promise<number> {
  await ExchangeRate.deleteMany({});
  await ExchangeRate.create({ usdToNpr: rate, updatedBy });
  return rate;
}
