import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

export function generateQRToken(): string {
  return uuidv4();
}

export async function generateQRDataUrl(token: string, baseUrl: string): Promise<string> {
  const url = `${baseUrl}/qr/${token}`;
  return QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: { dark: '#0D1B3E', light: '#F5ECD7' },
  });
}
