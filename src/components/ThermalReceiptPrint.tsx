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
        console.log("ThermalReceiptPrint: Starting print process...");
        if (typeof window !== 'undefined' && (window as any).db?.printThermalReceipt) {
          const html = buildThermalHtml(order, store, billNumber);
          console.log("ThermalReceiptPrint: Calling IPC printThermalReceipt...");
          const result = await (window as any).db.printThermalReceipt({ html, printerName });
          console.log("ThermalReceiptPrint: IPC result received:", result);
          if (result && !result.success) {
            alert("Print Failed: " + (result.error || "Unknown error"));
          }
        } else {
          console.warn("ThermalReceiptPrint: IPC not found, falling back to window.print()");
          window.print();
        }
      } catch (err) {
        console.error("ThermalReceiptPrint: Exception during print:", err);
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
    const rawName = (i.product_name || '').substring(0, 24);
    const name = rawName.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const itemTotal = (i.total ?? (i.subtotal + (i.gst_amount || 0)));
    return `
      <tr>
        <td colspan="4" class="text-left py-1">${name}</td>
      </tr>
      <tr class="border-bottom-thin">
        <td class="text-left pb-1" style="width: 30%; font-size: 10px;">${fmt(i.unit_price)}</td>
        <td class="text-center pb-1" style="width: 20%; font-size: 10px;">${i.quantity}</td>
        <td class="text-center pb-1" style="width: 20%; font-size: 10px;">${i.gst_rate}%</td>
        <td class="text-right pb-1" style="width: 30%;">${fmt(itemTotal)}</td>
      </tr>
    `;
  }).join('');

  const totQty = items.reduce((s: number, i: any) => s + (i.quantity || 0), 0);
  const itemsTotal = items.reduce((s: number, i: any) => s + (i.total ?? (i.subtotal + (i.gst_amount || 0))), 0);
  const gstTotal = items.reduce((s: number, i: any) => s + (i.gst_amount || 0), 0);
  const additionalCharges = order.total_amount - itemsTotal;
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { margin: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      line-height: 1.2;
      color: #000;
      width: 80mm;
      margin: 0;
      padding: 4mm;
      box-sizing: border-box;
    }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .border-bottom { border-bottom: 1px dashed #000; }
    .border-bottom-thin { border-bottom: 0.5px solid #eee; }
    .border-top { border-top: 1px dashed #000; }
    .py-1 { padding-top: 2px; padding-bottom: 2px; }
    .pb-1 { padding-bottom: 2px; }
    .my-2 { margin-top: 8px; margin-bottom: 8px; }
    .mb-1 { margin-bottom: 4px; }
    .mb-4 { margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th { border-bottom: 1px dashed #000; padding-bottom: 4px; font-size: 11px; }
    .gst-breakdown { font-size: 10px; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="text-center font-bold" style="font-size: 16px; margin-bottom: 2px;">${(store.name || 'Store Name').replace(/</g, '&lt;')}</div>
  ${store.address ? `<div class="text-center" style="font-size: 10px;">${store.address.replace(/</g, '&lt;')}</div>` : ''}
  ${store.phone ? `<div class="text-center" style="font-size: 10px;">Ph: ${store.phone.replace(/</g, '&lt;')}</div>` : ''}
  ${store.gstin ? `<div class="text-center" style="font-size: 10px;">GSTIN: ${store.gstin.replace(/</g, '&lt;')}</div>` : ''}
  
  <div class="text-center font-bold my-2 border-top border-bottom" style="padding: 4px 0;">CASH RECEIPT</div>
  
  <div style="display: flex; justify-content: space-between; font-size: 11px;" class="mb-1">
    <span>Bill: ${(billNumber || '').replace(/</g, '&lt;')}</span>
    <span>Date: ${formatDate(order.purchase_date)}</span>
  </div>
  <div class="mb-4" style="font-size: 11px;">
    Customer: ${(order.customer_name || 'Walk-in').replace(/</g, '&lt;')}
  </div>

  <table>
    <thead>
      <tr>
        <th class="text-left" style="width: 30%;">Price</th>
        <th class="text-center" style="width: 20%;">Qty</th>
        <th class="text-center" style="width: 20%;">GST%</th>
        <th class="text-right" style="width: 30%;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="border-top my-2"></div>
  
  <div style="display: flex; justify-content: space-between;" class="py-1">
    <span>Items Total:</span>
    <span>${fmt(itemsTotal)}</span>
  </div>
  
  ${gstTotal > 0 ? `
  <div class="gst-breakdown">
    <div style="display: flex; justify-content: space-between;">
      <span>CGST Amount:</span>
      <span>${fmt(gstTotal / 2)}</span>
    </div>
    <div style="display: flex; justify-content: space-between;">
      <span>SGST Amount:</span>
      <span>${fmt(gstTotal / 2)}</span>
    </div>
  </div>
  ` : ''}

  ${additionalCharges > 0.01 ? `
  <div style="display: flex; justify-content: space-between;" class="py-1">
    <span>Addl. Charges:</span>
    <span>${fmt(additionalCharges)}</span>
  </div>
  ` : ''}

  <div style="display: flex; justify-content: space-between; margin-top: 4px; border-top: 1px solid #000; padding-top: 4px;" class="font-bold py-1">
    <span style="font-size: 14px;">NET AMOUNT:</span>
    <span style="font-size: 14px;">Rs. ${fmt(order.total_amount)}</span>
  </div>

  <div class="border-top my-2"></div>
  
  <div style="display: flex; justify-content: space-between; font-size: 11px;">
    <span>Total Qty:</span>
    <span>${fmt(totQty)}</span>
  </div>

  <div class="text-center my-2" style="margin-top: 16px;">
    Thank You! Visit Again.
  </div>
  <div style="height: 10mm;"></div> <!-- Feed space before cut -->
</body>
</html>`;
}
