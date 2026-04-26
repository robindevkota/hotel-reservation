// Opens a browser print dialog with a receipt formatted for both
// 80 mm POS thermal printers and standard A4/Letter printers.
// The caller picks the receipt type; layout adapts via CSS @page.

export interface KitchenReceiptData {
  type: 'kitchen';
  orderId: string;
  placedAt: string;
  customer: string; // "Room 101" or walk-in name
  isWalkIn: boolean;
  paymentMethod: 'room_bill' | 'cash';
  items: { name: string; quantity: number; unitPrice: number }[];
  notes?: string;
  totalAmount: number;
  hotelName?: string;
}

export interface SpaReceiptData {
  type: 'spa';
  bookingId: string;
  completedAt: string;
  customer: string;
  isWalkIn: boolean;
  service: string;
  therapist: string;
  scheduledStart: string;
  scheduledEnd: string;
  duration: number;
  paymentMethod: 'room_bill' | 'cash';
  price: number;
  priceFormatted: string; // e.g. "$45.00" or "Rs. 6,075"
  hotelName?: string;
}

type ReceiptData = KitchenReceiptData | SpaReceiptData;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function receiptHtml(data: ReceiptData): string {
  const hotel = data.hotelName ?? 'Royal Suites';
  const now = formatDate(new Date().toISOString());

  const css = `
    *{margin:0;padding:0;box-sizing:border-box}
    @page{size:80mm auto;margin:4mm}
    @media print{
      body{width:72mm}
      .no-print{display:none}
    }
    body{
      font-family:'Courier New',Courier,monospace;
      font-size:12px;
      color:#000;
      width:72mm;
      padding:0 2mm;
    }
    .center{text-align:center}
    .right{text-align:right}
    .bold{font-weight:bold}
    .lg{font-size:15px}
    .sm{font-size:10px}
    .divider{border-top:1px dashed #000;margin:4px 0}
    .row{display:flex;justify-content:space-between;margin:2px 0}
    .item-name{flex:1;padding-right:4px}
    .badge{
      display:inline-block;
      border:1px solid #000;
      padding:1px 5px;
      font-size:10px;
      letter-spacing:.05em;
      text-transform:uppercase;
    }
    .print-btn{
      margin:12px auto;display:block;padding:8px 24px;
      background:#0D1B3E;color:#C9A84C;border:none;cursor:pointer;
      font-size:13px;font-family:inherit;letter-spacing:.08em;
    }
    .print-btn:hover{opacity:.88}
  `;

  let body = '';

  if (data.type === 'kitchen') {
    const d = data as KitchenReceiptData;
    const itemsHtml = d.items.map(it => `
      <div class="row">
        <span class="item-name">${it.quantity}x ${it.name}</span>
        <span>$${(it.unitPrice * it.quantity).toFixed(2)}</span>
      </div>
    `).join('');

    body = `
      <div class="center bold lg">${hotel}</div>
      <div class="center sm">Kitchen Receipt</div>
      <div class="center sm">${now}</div>
      <div class="divider"></div>
      <div class="row">
        <span class="bold">Order #</span>
        <span>${d.orderId.slice(-6).toUpperCase()}</span>
      </div>
      <div class="row">
        <span class="bold">Customer</span>
        <span>${d.customer}</span>
      </div>
      <div class="row">
        <span class="bold">Placed</span>
        <span>${formatDate(d.placedAt)}</span>
      </div>
      <div class="divider"></div>
      ${itemsHtml}
      <div class="divider"></div>
      <div class="row bold lg">
        <span>TOTAL</span>
        <span>$${d.totalAmount.toFixed(2)}</span>
      </div>
      <div class="divider"></div>
      <div class="row">
        <span>Payment</span>
        <span class="badge">${d.paymentMethod === 'cash' ? 'Cash' : 'Room Bill'}</span>
      </div>
      ${d.isWalkIn ? '<div class="center sm" style="margin-top:3px">Walk-in Customer</div>' : ''}
      ${d.notes ? `<div class="divider"></div><div class="sm" style="margin:2px 0">Note: ${d.notes}</div>` : ''}
      <div class="divider"></div>
      <div class="center sm" style="margin-top:4px">Thank you for dining with us!</div>
    `;
  } else {
    const d = data as SpaReceiptData;
    body = `
      <div class="center bold lg">${hotel}</div>
      <div class="center sm">Spa Receipt</div>
      <div class="center sm">${now}</div>
      <div class="divider"></div>
      <div class="row">
        <span class="bold">Booking #</span>
        <span>${d.bookingId.slice(-6).toUpperCase()}</span>
      </div>
      <div class="row">
        <span class="bold">Guest</span>
        <span>${d.customer}</span>
      </div>
      <div class="divider"></div>
      <div class="row">
        <span class="bold">Service</span>
        <span>${d.service}</span>
      </div>
      <div class="row">
        <span class="bold">Therapist</span>
        <span>${d.therapist}</span>
      </div>
      <div class="row">
        <span class="bold">Time</span>
        <span>${d.scheduledStart} – ${d.scheduledEnd}</span>
      </div>
      <div class="row">
        <span class="bold">Duration</span>
        <span>${d.duration} min</span>
      </div>
      <div class="divider"></div>
      <div class="row bold lg">
        <span>TOTAL</span>
        <span>${d.priceFormatted}</span>
      </div>
      <div class="divider"></div>
      <div class="row">
        <span>Payment</span>
        <span class="badge">${d.paymentMethod === 'cash' ? 'Cash at Desk' : 'Room Bill'}</span>
      </div>
      ${d.isWalkIn ? '<div class="center sm" style="margin-top:3px">Walk-in Customer</div>' : ''}
      <div class="divider"></div>
      <div class="center sm" style="margin-top:4px">Thank you for choosing our spa!</div>
    `;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt</title>
  <style>${css}</style>
</head>
<body>
  ${body}
  <button class="no-print print-btn" onclick="window.print()">Print Receipt</button>
  <script>
    // Auto-open print dialog after a short delay so the page renders first
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 400);
    });
  <\/script>
</body>
</html>`;
}

export function printReceipt(data: ReceiptData): void {
  const win = window.open('', '_blank', 'width=400,height=600,toolbar=0,menubar=0,location=0');
  if (!win) {
    alert('Pop-up blocked. Please allow pop-ups for this site to print receipts.');
    return;
  }
  win.document.write(receiptHtml(data));
  win.document.close();
}
