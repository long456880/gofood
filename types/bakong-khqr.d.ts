// bakong-khqr ships no type definitions — this covers only what lib/bakong.ts uses.
declare module "bakong-khqr" {
  export const khqrData: {
    currency: { usd: number; khr: number };
    merchantType: { merchant: string; individual: string };
  };

  export class IndividualInfo {
    constructor(
      bakongAccountID: string,
      merchantName: string,
      merchantCity: string,
      optional?: Record<string, unknown>
    );
  }

  export class MerchantInfo extends IndividualInfo {
    constructor(
      bakongAccountID: string,
      merchantName: string,
      merchantCity: string,
      merchantID: string,
      acquiringBank: string,
      optional?: Record<string, unknown>
    );
  }

  type KHQRStatus = { code: number; errorCode: number | null; message: string | null };
  type KHQRResult<T> = { status: KHQRStatus; data: T | null };

  export class BakongKHQR {
    generateIndividual(info: IndividualInfo): KHQRResult<{ qr: string; md5: string }>;
    generateMerchant(info: MerchantInfo): KHQRResult<{ qr: string; md5: string }>;
  }
}
