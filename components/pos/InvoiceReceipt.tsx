import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { Share2, Download, CheckCircle2 } from 'lucide-react';

interface InvoiceReceiptProps {
  invoiceData: any;
  onClose: () => void;
}

export function InvoiceReceipt({ invoiceData, onClose }: InvoiceReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return "";
    let formatted = phone.replace(/\D/g, '');
    if (formatted.startsWith('0')) {
      formatted = '92' + formatted.substring(1);
    }
    return formatted;
  };

  const shareInvoice = async () => {
    if (!receiptRef.current) return;
    
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2 });
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `${invoiceData.invoice_number}.png`, { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Invoice ${invoiceData.invoice_number}`,
            text: `Here is your invoice ${invoiceData.invoice_number} from ZeestPOS.`,
          });
        } else {
          // Fallback: download the image
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${invoiceData.invoice_number}.png`;
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
        
        // WhatsApp Web/App URLs don't accept files directly via URL. 
        // We will try to copy it to clipboard, then open WhatsApp Web.
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          
          let waUrl = `https://wa.me/`;
          if (invoiceData.customerPhone) {
            waUrl += formatPhoneNumber(invoiceData.customerPhone);
          }
          waUrl += `?text=Please+paste+the+invoice+image+from+your+clipboard!`;
          
          window.open(waUrl, '_blank');
        } catch (clipErr) {
          console.error(clipErr);
          // If clipboard fails, just download and open wa
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${invoiceData.invoice_number}.png`;
          a.click();
          URL.revokeObjectURL(url);
          
          let waUrl = `https://wa.me/`;
          if (invoiceData.customerPhone) {
            waUrl += formatPhoneNumber(invoiceData.customerPhone);
          }
          window.open(waUrl, '_blank');
        }

      }, 'image/png');
    } catch (err) {
      console.error("Failed to generate WhatsApp image", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-slate-100 dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
          <h2 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-green-500" /> Payment Successful
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded-lg">Done</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-slate-200 dark:bg-slate-950">
          <div 
            ref={receiptRef} 
            className="bg-white w-full max-w-[350px] p-6 shadow-sm font-mono text-slate-900"
          >
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold tracking-tight">ZeestPOS</h1>
              <p className="text-xs text-slate-500 mt-1">Thank you for your purchase!</p>
            </div>
            
            <div className="text-xs space-y-1 mb-6 border-b border-dashed border-slate-300 pb-4">
              <p>Invoice: {invoiceData.invoice_number}</p>
              <p>Date: {invoiceData.date.toLocaleString()}</p>
              <p>Cashier: {invoiceData.cashierName}</p>
              {invoiceData.customer_name ? (
                <p>Customer: {invoiceData.customer_name}</p>
              ) : invoiceData.customerObj ? (
                <p>Customer: {invoiceData.customerObj.full_name}</p>
              ) : null}
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-xs font-bold border-b border-slate-300 pb-2">
                <span>Item</span>
                <span>Total</span>
              </div>
              {invoiceData.cart.map((item: any) => (
                <div key={item.product.id} className="flex justify-between text-sm">
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
                <span>Rs {invoiceData.total_amount}</span>
              </div>
              {invoiceData.discount_amount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount</span>
                  <span>- Rs {invoiceData.discount_amount}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-slate-200">
                <span>Total</span>
                <span>Rs {invoiceData.total_amount - invoiceData.discount_amount}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex gap-3 shrink-0">
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
      </div>
    </div>
  );
}
