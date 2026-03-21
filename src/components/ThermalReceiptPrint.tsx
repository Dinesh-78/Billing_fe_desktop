import { useEffect } from 'react';
import type { Order } from '@/types';

interface ThermalReceiptPrintProps {
  order: Order & { items: (import('@/types').OrderItem & { hsn_code?: string; mrp?: number })[] };
  store: Record<string, string>;
  billNumber: string;
  printerName?: string;
  onPrinted?: () => void;
}

export default function ThermalReceiptPrint({ order, store, billNumber, printerName, onPrinted }: ThermalReceiptPrintProps) {
  useEffect(() => {
    const runPrint = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).db?.printThermalReceipt) {
          const html = buildThermalHtml(order, store, billNumber);
          await (window as any).db.printThermalReceipt({ html, printerName });
        } else {
          console.warn("Thermal printing IPC not found, falling back to System Print");
          window.print();
        }
      } catch (err) {
        console.error("Thermal Print failed:", err);
      } finally {
        onPrinted?.();
      }
    };
    runPrint();
  }, [order, store, billNumber, printerName, onPrinted]);

  return null;
}

function buildThermalHtml(order: any, store: Record<string, string>, billNumber: string): string {
  const items = order.items || [];
  const fmt = (n: number) => (n ?? 0).toFixed(2);
  
  const formatDate = (d: string) => {
    if (!d) return '';
    const [y, m, dd] = d.split('-').map(Number);
    return `${String(dd).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  };

  const rows = items.map((i: any) => {
    const rawName = (i.product_name || '').substring(0, 20);
    const name = rawName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const total = (i.total || i.subtotal + (i.gst_amount || 0));
    return `
      <tr>
        <td class="text-left py-1">${name}</td>
        <td class="text-center py-1">${i.quantity}</td>
        <td class="text-right py-1">${fmt(i.unit_price)}</td>
        <td class="text-right py-1">${fmt(total)}</td>
      </tr>
    `;
  }).join('');

  const totQty = items.reduce((s: number, i: any) => s + (i.quantity || 0), 0);
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { margin: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      color: #000;
      width: 80mm; /* 3 inch thermal paper standard */
      margin: 0;
      padding: 4mm;
      box-sizing: border-box;
    }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .border-bottom { border-bottom: 1px dashed #000; }
    .border-top { border-top: 1px dashed #000; }
    .py-1 { padding-top: 2px; padding-bottom: 2px; }
    .my-2 { margin-top: 8px; margin-bottom: 8px; }
    .mb-1 { margin-bottom: 4px; }
    .mb-4 { margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th { border-bottom: 1px dashed #000; padding-bottom: 4px; }
  </style>
</head>
<body>
  <div class="text-center font-bold" style="font-size: 16px;">${(store.name || 'Store Name').replace(/</g, '&lt;')}</div>
  ${store.address ? `<div class="text-center">${store.address.replace(/</g, '&lt;')}</div>` : ''}
  ${store.phone ? `<div class="text-center">Ph: ${store.phone.replace(/</g, '&lt;')}</div>` : ''}
  ${store.gstin ? `<div class="text-center">GSTIN: ${store.gstin.replace(/</g, '&lt;')}</div>` : ''}
  
  <div class="text-center font-bold my-2 border-top border-bottom" style="padding: 4px 0;">CASH RECEIPT</div>
  
  <div style="display: flex; justify-content: space-between;" class="mb-1">
    <span>Bill: ${(billNumber || '').replace(/</g, '&lt;')}</span>
    <span>Date: ${formatDate(order.purchase_date)}</span>
  </div>
  <div class="mb-4">
    Customer: ${(order.customer_name || 'Walk-in').replace(/</g, '&lt;')}
  </div>

  <table>
    <thead>
      <tr>
        <th class="text-left">Item</th>
        <th class="text-center">Qty</th>
        <th class="text-right">Price</th>
        <th class="text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="border-top my-2"></div>
  
  <div style="display: flex; justify-content: space-between;" class="font-bold py-1">
    <span>Total Qty:</span>
    <span>${fmt(totQty)}</span>
  </div>
  <div style="display: flex; justify-content: space-between;" class="font-bold py-1">
    <span style="font-size: 14px;">NET AMOUNT:</span>
    <span style="font-size: 14px;">Rs. ${fmt(order.total_amount)}</span>
  </div>

  <div class="border-top my-2"></div>
  
  <div class="text-center my-2">
    Thank You! Visit Again.
  </div>
  <div style="height: 10mm;"></div> <!-- Feed space before cut -->
</body>
</html>`;
}
