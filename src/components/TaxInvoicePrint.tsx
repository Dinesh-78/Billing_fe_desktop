import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Order } from '@/types';
import { numberToWords } from '@/lib/numberToWords';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (isNaN(m) || m < 1 || m > 12) return dateStr;
  return `${String(d).padStart(2, '0')}/${MONTHS[m - 1]}/${y}`;
}

interface TaxInvoicePrintProps {
  order: Order & { items: (import('@/types').OrderItem & { hsn_code?: string; mrp?: number })[] };
  store: Record<string, string>;
  billNumber: string;
  onPrinted?: () => void;
}

export default function TaxInvoicePrint({ order, store, billNumber, onPrinted }: TaxInvoicePrintProps) {
  useEffect(() => {
    const run = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).db?.printInvoiceToPdf) {
          await (window as any).db.printInvoiceToPdf({ order, store, billNumber });
        } else {
          window.print();
        }
      } finally {
        onPrinted?.();
      }
    };
    run();
  }, [onPrinted, order, store, billNumber]);

  const cgstTotal = (order.items || []).reduce((sum, i) => {
    const gstAmt = i.gst_amount ?? (i.subtotal * (i.gst_rate / 100));
    return sum + gstAmt / 2;
  }, 0);
  const sgstTotal = (order.items || []).reduce((sum, i) => {
    const gstAmt = i.gst_amount ?? (i.subtotal * (i.gst_rate / 100));
    return sum + gstAmt / 2;
  }, 0);
  const totQty = (order.items || []).reduce((s, i) => s + i.quantity, 0);

  const invoiceContent = (
    <div id="invoice-print" className="fixed inset-0 overflow-auto bg-white text-black p-8 -z-50 opacity-0 print:opacity-100 print:relative print:z-50" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div className="max-w-[210mm] mx-auto text-sm">
          <h1 className="text-xl font-bold text-center mb-1">TAX INVOICE</h1>
          <h2 className="text-lg font-bold text-center mb-2">{store.name || 'Store Name'}</h2>
          <p className="text-center text-sm mb-0.5">{store.address || ''}</p>
          <p className="text-center text-sm mb-0.5">{store.phone || ''}</p>
          <p className="text-center text-sm mb-4">GSTIN: {store.gstin || ''} | FSSAI No: {store.fssai || ''}</p>

          <div className="flex justify-between mb-4 border-b border-black pb-2">
            <div>
              <span className="font-semibold">CASH BILL</span>
              <span className="ml-4 text-sm">
                {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
          <div className="flex justify-between mb-4 text-sm">
            <span>Bill No: {billNumber}</span>
            <span>Date: {formatDate(order.purchase_date)}</span>
            <span>Name: {order.customer_name}</span>
          </div>

          <table className="w-full border-collapse text-sm mb-4">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-2 pr-4">Particulars</th>
                <th className="text-left py-2 pr-4 w-24">HSN</th>
                <th className="text-right py-2 pr-4 w-24">Qty/GST%</th>
                <th className="text-right py-2 pr-4 w-28">Rate/Mrp</th>
                <th className="text-right py-2 w-24">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item) => (
                <tr key={item.product_id} className="border-b border-gray-300">
                  <td className="py-2 pr-4 align-top">
                    <div>{item.product_name}</div>
                  </td>
                  <td className="py-2 pr-4 align-top">{item.hsn_code || '-'}</td>
                  <td className="py-2 pr-4 text-right align-top">
                    <div>{item.quantity}</div>
                    <div className="text-xs">{item.gst_rate}%</div>
                  </td>
                  <td className="py-2 pr-4 text-right align-top">
                    <div>{item.unit_price?.toFixed(2) || '0.00'}</div>
                    {item.mrp != null && item.mrp > 0 && (
                      <div className="text-xs">{item.mrp.toFixed(2)}</div>
                    )}
                  </td>
                  <td className="py-2 text-right align-top">
                    {(item.total ?? (item.subtotal + (item.gst_amount || 0))).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end gap-8 mb-4 text-sm">
            <span>Tot Qty: {totQty.toFixed(2)}</span>
            <span>T.Pcs: 0.00</span>
          </div>
          <div className="flex justify-end gap-8 mb-2 text-sm">
            <span>Total Amt: {order.total_amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-end gap-8 mb-2 text-sm">
            <span>CGST Amt: {cgstTotal.toFixed(2)}</span>
            <span>SGST Amt: {sgstTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-end gap-8 mb-6 text-sm font-semibold">
            <span>Net Amount: ₹{order.total_amount.toFixed(2)}</span>
          </div>

          <p className="text-sm mb-8">
            Rupees {numberToWords(order.total_amount)}
          </p>
          <p className="text-sm mt-12">Authorised Signature.</p>
      </div>
    </div>
  );

  return createPortal(invoiceContent, document.body);
}
