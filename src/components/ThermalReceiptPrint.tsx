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
          const printData = buildThermalData(order, store, billNumber);
          console.log("ThermalReceiptPrint: Calling IPC printThermalReceipt...");
          const result = await (window as any).db.printThermalReceipt({ data: printData, printerName });
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

function buildThermalData(order: any, store: Record<string, string>, billNumber: string): any[] {
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
        <td colspan="4" style="text-align: left; padding: 2px 0; font-family: monospace;">${name}</td>
      </tr>
      <tr style="border-bottom: 0.5px solid #eee;">
        <td style="text-align: left; padding-bottom: 2px; width: 30%; font-size: 10px; font-family: monospace;">${fmt(i.unit_price)}</td>
        <td style="text-align: center; padding-bottom: 2px; width: 20%; font-size: 10px; font-family: monospace;">${i.quantity}</td>
        <td style="text-align: center; padding-bottom: 2px; width: 20%; font-size: 10px; font-family: monospace;">${i.gst_rate}%</td>
        <td style="text-align: right; padding-bottom: 2px; width: 30%; font-family: monospace;">${fmt(itemTotal)}</td>
      </tr>
    `;
  }).join('');

  const totQty = items.reduce((s: number, i: any) => s + (i.quantity || 0), 0);
  const itemsTotal = items.reduce((s: number, i: any) => s + (i.total ?? (i.subtotal + (i.gst_amount || 0))), 0);
  const gstTotal = items.reduce((s: number, i: any) => s + (i.gst_amount || 0), 0);
  const additionalCharges = order.total_amount - itemsTotal;
  
  const htmlContent = `
  <div style="font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #000; width: 100%; box-sizing: border-box;">
    <div style="text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 2px;">${(store.name || 'Store Name').replace(/</g, '&lt;')}</div>
    ${store.address ? `<div style="text-align: center; font-size: 10px;">${store.address.replace(/</g, '&lt;')}</div>` : ''}
    ${store.phone ? `<div style="text-align: center; font-size: 10px;">Ph: ${store.phone.replace(/</g, '&lt;')}</div>` : ''}
    ${store.gstin ? `<div style="text-align: center; font-size: 10px;">GSTIN: ${store.gstin.replace(/</g, '&lt;')}</div>` : ''}
    
    <div style="text-align: center; font-weight: bold; margin: 8px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0;">CASH RECEIPT</div>
    
    <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
      <span>Bill: ${(billNumber || '').replace(/</g, '&lt;')}</span>
      <span>Date: ${formatDate(order.purchase_date)}</span>
    </div>
    <div style="font-size: 11px; margin-bottom: 16px;">
      Customer: ${(order.customer_name || 'Walk-in').replace(/</g, '&lt;')}
    </div>

    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="border-bottom: 1px dashed #000; padding-bottom: 4px; font-size: 11px; text-align: left; width: 30%;">Price</th>
          <th style="border-bottom: 1px dashed #000; padding-bottom: 4px; font-size: 11px; text-align: center; width: 20%;">Qty</th>
          <th style="border-bottom: 1px dashed #000; padding-bottom: 4px; font-size: 11px; text-align: center; width: 20%;">GST%</th>
          <th style="border-bottom: 1px dashed #000; padding-bottom: 4px; font-size: 11px; text-align: right; width: 30%;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
    
    <div style="display: flex; justify-content: space-between; padding: 2px 0;">
      <span>Items Total:</span>
      <span>${fmt(itemsTotal)}</span>
    </div>
    
    ${gstTotal > 0 ? `
    <div style="font-size: 10px; margin-top: 4px;">
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
    <div style="display: flex; justify-content: space-between; padding: 2px 0;">
      <span>Addl. Charges:</span>
      <span>${fmt(additionalCharges)}</span>
    </div>
    ` : ''}

    <div style="display: flex; justify-content: space-between; margin-top: 4px; border-top: 1px solid #000; padding-top: 4px; font-weight: bold; padding: 2px 0;">
      <span style="font-size: 14px;">NET AMOUNT:</span>
      <span style="font-size: 14px;">Rs. ${fmt(order.total_amount)}</span>
    </div>

    <div style="border-top: 1px dashed #000; margin: 8px 0;"></div>
    
    <div style="display: flex; justify-content: space-between; font-size: 11px;">
      <span>Total Qty:</span>
      <span>${fmt(totQty)}</span>
    </div>

    <div style="text-align: center; margin-top: 16px; margin-bottom: 8px;">
      Thank You! Visit Again.
    </div>
    <div style="height: 10mm;"></div> <!-- Feed space before cut -->
  </div>`;
  
  return [
    {
      type: 'text',
      value: htmlContent,
      style: {}
    }
  ];
}
