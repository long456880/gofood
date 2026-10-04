import { BakongKHQR, khqrData, IndividualInfo } from "bakong-khqr";

// NBC's Bakong Open API — https://api-bakong.nbc.gov.kh
const API_BASE_URL = process.env.BAKONG_API_BASE_URL || "https://api-bakong.nbc.gov.kh";

// How long a generated QR stays valid before the person has to re-open the
// pay screen for a fresh one.
const PAYMENT_EXPIRY_MS = 5 * 60 * 1000;

export type KHQRPayment = {
  qr: string;
  md5: string;
  expiresAt: number;
};

// Builds a personal (individual) KHQR payment request for the given amount.
// Requires BAKONG_ACCOUNT_ID / BAKONG_ACCOUNT_NAME / BAKONG_ACCOUNT_CITY to
// be set to the Bakong account that should receive the money.
export function generatePaymentQR(amountUsd: number, billNumber: string): KHQRPayment {
  const accountId = process.env.BAKONG_ACCOUNT_ID;
  const accountName = process.env.BAKONG_ACCOUNT_NAME;
  const accountCity = process.env.BAKONG_ACCOUNT_CITY;
  if (!accountId || !accountName || !accountCity) {
    throw new Error(
      "Bakong is not configured — set BAKONG_ACCOUNT_ID, BAKONG_ACCOUNT_NAME and BAKONG_ACCOUNT_CITY"
    );
  }

  const expiresAt = Date.now() + PAYMENT_EXPIRY_MS;
  const individualInfo = new IndividualInfo(accountId, accountName, accountCity, {
    currency: khqrData.currency.usd,
    amount: amountUsd,
    billNumber,
    expirationTimestamp: expiresAt,
  });

  const khqr = new BakongKHQR();
  const response = khqr.generateIndividual(individualInfo);
  if (!response.data) {
    throw new Error(response.status?.message || "Failed to generate KHQR code");
  }

  return { qr: response.data.qr, md5: response.data.md5, expiresAt };
}

// Asks Bakong's Open API whether the transaction behind this QR has been
// paid. Requires BAKONG_API_TOKEN (a renewable bearer token from the Bakong
// developer portal).
//
// Bakong's daily quota for this endpoint is small (100 requests/day per
// token as of writing) and, once exceeded, it responds with the exact same
// HTTP 200 / "could not be found" shape as a genuinely unpaid transaction
// (errorCode 19 vs errorCode 1) — so callers must not poll aggressively, and
// this function only treats the real "not found yet" case as "not paid";
// anything else (rate limit, bad token, etc.) throws instead of silently
// reporting unpaid, so polling can surface the failure instead of hanging.
export async function isPaymentPaid(md5: string): Promise<boolean> {
  const token = process.env.BAKONG_API_TOKEN;
  if (!token) {
    throw new Error("Bakong is not configured — set BAKONG_API_TOKEN");
  }

  const res = await fetch(`${API_BASE_URL}/v1/check_transaction_by_md5`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ md5 }),
  });

  if (!res.ok) {
    throw new Error(`Bakong verification request failed (HTTP ${res.status})`);
  }

  const data = await res.json();
  if (data?.responseCode === 0) return true;

  // errorCode 1 = "transaction could not be found" — the expected state
  // while the payment hasn't landed yet, so keep polling.
  if (data?.errorCode === 1) return false;

  // Anything else (rate limit, auth issue, etc.) is a real failure.
  throw new Error(data?.responseMessage || "Bakong verification failed");
}
