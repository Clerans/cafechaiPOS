import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface BarcodeQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  sku: string;
  name: string;
  price: number;
}

export function BarcodeQRModal({ isOpen, onClose, sku, name, price }: BarcodeQRModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Label - ${sku}</title>
            <style>
              body {
                font-family: monospace;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px;
                text-align: center;
              }
              .barcode {
                font-size: 32px;
                letter-spacing: 6px;
                margin: 20px 0;
                font-weight: bold;
              }
              .label {
                border: 2px dashed #000;
                padding: 20px;
                border-radius: 8px;
                width: 250px;
              }
            </style>
          </head>
          <body>
            <div class="label">
              <h3 style="margin: 0 0 10px 0;">${name}</h3>
              <div style="font-size: 14px; font-weight: bold;">Price: $${price.toFixed(2)}</div>
              <div style="margin: 15px 0; height: 50px; background: repeating-linear-gradient(90deg, #000, #000 2px, transparent 2px, transparent 6px); width: 100%;"></div>
              <div class="barcode">${sku}</div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-card w-full max-w-md border rounded-xl shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        <h2 className="text-lg font-bold mb-1">Generate Label</h2>
        <p className="text-xs text-muted-foreground mb-6">Visual rendering labels for barcode scanners and receipts</p>

        <div className="flex flex-col items-center justify-center p-6 border rounded-xl bg-accent/20 mb-6">
          <div className="text-sm font-bold text-center mb-1 text-foreground">{name}</div>
          <div className="text-xs font-semibold text-primary mb-4">${price.toFixed(2)}</div>

          {/* Barcode Graphic Block Mock */}
          <div className="w-full h-16 flex justify-between items-stretch px-4 bg-white border border-border py-2 mb-2 rounded">
            {/* Generate barcode line slices */}
            {Array.from({ length: 48 }).map((_, i) => {
              const widths = [1, 2, 3, 4];
              const w = widths[(i * 7) % widths.length];
              const isDark = (i * 3) % 5 < 3;
              return (
                <div
                  key={i}
                  className="bg-black shrink-0"
                  style={{
                    width: `${isDark ? w : 0}px`,
                    opacity: isDark ? 1 : 0,
                  }}
                />
              );
            })}
          </div>
          <div className="font-mono text-xs tracking-wider mb-8 text-muted-foreground font-bold">{sku}</div>

          {/* QR Code Grid Graphic Block Mock */}
          <div className="h-32 w-32 border border-border bg-white p-2 rounded flex flex-wrap items-center justify-center relative">
            <div className="h-28 w-28 grid grid-cols-8 gap-0.5">
              {Array.from({ length: 64 }).map((_, i) => {
                // Mock corner anchors of QR Code
                const isAnchor =
                  (Math.floor(i / 8) < 3 && i % 8 < 3) || // top-left
                  (Math.floor(i / 8) < 3 && i % 8 >= 5) || // top-right
                  (Math.floor(i / 8) >= 5 && i % 8 < 3); // bottom-left
                const isFilled = isAnchor || (i * 13) % 7 < 4;
                return (
                  <div
                    key={i}
                    className={isFilled ? "bg-black rounded-xs" : "bg-transparent"}
                  />
                );
              })}
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground mt-2 font-mono">Scan QR for Product SKU</div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-2">
            <Printer className="h-3.5 w-3.5" />
            <span>Print Label</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
