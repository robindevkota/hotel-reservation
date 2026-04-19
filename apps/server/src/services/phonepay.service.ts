/**
 * PhonePay Nepal payment service.
 * Currently runs in MOCK mode — swap the verify function body
 * with real PhonePay API call once merchant credentials are available.
 *
 * To go live:
 *   1. Set PHONEPAY_MERCHANT_ID and PHONEPAY_SECRET_KEY in .env
 *   2. Set PHONEPAY_BASE_URL to PhonePay Nepal's live API URL
 *   3. Replace mock logic in verifyTransaction() with real API call
 */

const MOCK_MODE = !process.env.PHONEPAY_MERCHANT_ID;

export interface PhonePayVerifyResult {
  success: boolean;
  amount: number;
  transactionId: string;
  message: string;
}

/**
 * Verify a PhonePay transaction ID against expected amount.
 * In mock mode: any transaction ID starting with "TEST" succeeds.
 */
export async function verifyTransaction(
  transactionId: string,
  expectedAmountNPR: number
): Promise<PhonePayVerifyResult> {
  if (MOCK_MODE) {
    // MOCK: transaction IDs starting with "TEST" always succeed
    if (transactionId.toUpperCase().startsWith('TEST')) {
      return {
        success: true,
        amount: expectedAmountNPR,
        transactionId,
        message: '[MOCK] Payment verified successfully',
      };
    }
    return {
      success: false,
      amount: 0,
      transactionId,
      message: '[MOCK] Invalid transaction ID. Use TEST followed by numbers (e.g. TEST123456)',
    };
  }

  // ── REAL PhonePay Nepal API (replace when credentials available) ──────
  // const res = await fetch(`${process.env.PHONEPAY_BASE_URL}/verify`, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Merchant-Id': process.env.PHONEPAY_MERCHANT_ID!,
  //     'Authorization': `Bearer ${process.env.PHONEPAY_SECRET_KEY}`,
  //   },
  //   body: JSON.stringify({ transactionId }),
  // });
  // const data = await res.json();
  // return {
  //   success: data.status === 'SUCCESS' && data.amount === expectedAmountNPR,
  //   amount: data.amount,
  //   transactionId,
  //   message: data.message,
  // };

  throw new Error('PhonePay credentials not configured');
}

/**
 * Get merchant payment info to show guest (QR number / phone number).
 */
export function getMerchantInfo() {
  return {
    merchantName: process.env.PHONEPAY_MERCHANT_NAME || 'Royal Suites Hotel',
    merchantPhone: process.env.PHONEPAY_MERCHANT_PHONE || '98XXXXXXXX',
    merchantId: process.env.PHONEPAY_MERCHANT_ID || 'MOCK_MERCHANT',
    isMock: MOCK_MODE,
  };
}
