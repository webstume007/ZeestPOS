import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { Share2, Download, CheckCircle2 } from 'lucide-react';
import { Sale } from '@/lib/db';
import { format } from 'date-fns';

interface InvoiceReceiptProps {
  sale: Partial<Sale>;
  items: {
    product: any;
    quantity: number;
    price_applied: number;
  }[];
  onClose?: () => void;
}

export function InvoiceReceipt({ sale, items, onClose }: InvoiceReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const shareInvoice = async () => {
    if (!receiptRef.current) return;
    
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2 });
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `${sale.invoice_number || 'invoice'}.png`, { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Invoice ${sale.invoice_number}`,
            text: `Here is your invoice ${sale.invoice_number} from BajwaStore.`,
          });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${sale.invoice_number || 'invoice'}.png`;
          a.click();
          URL.revokeObjectURL(url);
          alert("Sharing via API not supported on this device. The image has been downloaded.");
        }
      }, 'image/png');
    } catch (err) {
      console.error("Failed to generate or share invoice", err);
      alert("Failed to share invoice.");
    }
  };

  const sendToWhatsAppWeb = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2 });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          
          let waUrl = `https://wa.me/?text=Please+paste+the+invoice+image+from+your+clipboard!`;
          window.open(waUrl, '_blank');
        } catch (clipErr) {
          console.error(clipErr);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${sale.invoice_number || 'invoice'}.png`;
          a.click();
          URL.revokeObjectURL(url);
          window.open(`https://wa.me/`, '_blank');
        }
      }, 'image/png');
    } catch (err) {
      console.error("Failed to generate WhatsApp image", err);
    }
  };

  const dateStr = sale.timestamp ? format(new Date(sale.timestamp), "MMM dd, yyyy hh:mm a") : format(new Date(), "MMM dd, yyyy hh:mm a");

  return (
    <div className="flex flex-col items-center">
      {/* Header if it's rendered inside a modal with onClose */}
      {onClose && (
        <div className="w-full max-w-md p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center rounded-t-3xl">
          <h2 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-green-500" /> Success
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded-lg">Done</button>
        </div>
      )}

      <div className="w-full flex-1 overflow-y-auto p-6 flex justify-center bg-slate-200 dark:bg-slate-950/20">
        <div 
          ref={receiptRef} 
          className="bg-white w-full max-w-[350px] p-6 shadow-sm font-mono text-slate-900 rounded"
        >
          <div className="flex flex-col items-center border-b border-black pb-4 mb-4">
            <h1 className="text-2xl font-bold tracking-tight mb-1">BajwaStore</h1>
            <p className="text-xs text-gray-500">Invoice #{sale.invoice_number || sale.invoice_id?.split('-')[0]}</p>
          </div>
          
          <div className="text-xs space-y-1 mb-6 border-b border-dashed border-slate-300 pb-4">
            <p>Date: {dateStr}</p>
            <p>Cashier: {sale.cashier_id || "Admin"}</p>
            <p>Customer: {sale.customer_name || "Walk-in Customer"}</p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-xs font-bold border-b border-slate-300 pb-2">
              <span>Item</span>
              <span>Total</span>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <div className="pr-4">
                  <p className="font-medium">{item.product.name_en}</p>
                  <p className="text-xs text-slate-500">{item.quantity} x {item.price_applied}</p>
                </div>
                <span className="font-medium whitespace-nowrap">Rs {item.quantity * item.price_applied}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1 text-sm border-t border-dashed border-slate-300 pt-4">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>Rs {Number(sale.total_amount).toFixed(0)}</span>
            </div>
            {Number(sale.discount_amount) > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount</span>
                <span>- Rs {Number(sale.discount_amount).toFixed(0)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-slate-200">
              <span>Total</span>
              <span>Rs {(Number(sale.total_amount) - Number(sale.discount_amount || 0)).toFixed(0)}</span>
            </div>
          </div>
        </div>
      </div>

      {onClose && (
        <div className="w-full max-w-md p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex gap-3 rounded-b-3xl mt-auto">
          <button 
            onClick={shareInvoice}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Share2 className="w-5 h-5" /> Share
          </button>
          
          <button 
            onClick={sendToWhatsAppWeb}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
          >
            WhatsApp
          </button>
        </div>
      )}
    </div>
  );
}
