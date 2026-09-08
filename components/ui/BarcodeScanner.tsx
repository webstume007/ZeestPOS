"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { X } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // Initialize scanner
    const scanner = new Html5QrcodeScanner(
      "barcode-scanner",
      { fps: 10, qrbox: { width: 250, height: 150 } },
      /* verbose= */ false
    );
    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        scanner.clear();
        onScan(decodedText);
      },
      (errorMessage) => {
        // Ignore normal scan failures
      }
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-white">Scan Barcode</h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 bg-slate-50 dark:bg-slate-950/50">
          <div id="barcode-scanner" className="w-full rounded-xl overflow-hidden bg-black" />
          {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
          <p className="text-xs text-slate-500 text-center mt-4">Point your camera at the barcode</p>
        </div>
      </div>
    </div>
  );
}
