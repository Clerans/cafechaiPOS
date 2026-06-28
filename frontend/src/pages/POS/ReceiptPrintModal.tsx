import { Printer, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CartItem {
  id: number;
  productId: number;
  variantId: number | null;
  name: string;
  sku: string;
  price: number;
  cost: number;
  quantity: number;
}

interface PaymentLine {
  method: string;
  amount: number;
}

interface ReceiptPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceNumber: string;
  items: CartItem[];
  total: number;
  tax: number;
  discount: number;
  serviceCharge: number;
  payments: PaymentLine[];
  cashierName: string;
  onDone: () => void;
}

export function ReceiptPrintModal({
  isOpen,
  onClose,
  invoiceNumber,
  items,
  total,
  tax,
  discount,
  serviceCharge,
  payments,
  cashierName,
  onDone,
}: ReceiptPrintModalProps) {
  if (!isOpen) return null;

  const handlePrintReceipt = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Receipt - ${invoiceNumber}</title>
            <style>
              body {
                font-family: 'Courier New', Courier, monospace;
                padding: 10px;
                width: 280px;
                font-size: 12px;
                color: #000;
              }
              .center { text-align: center; }
              .dashed { border-top: 1px dashed #000; margin: 8px 0; }
              .flex { display: flex; justify-content: space-between; }
              .bold { font-weight: bold; }
              table { width: 100%; font-size: 11px; }
              th { text-align: left; }
            </style>
          </head>
          <body>
            <div class="center">
              <h2 style="margin: 0 0 5px 0;">Cafe Chai POS</h2>
              <p style="margin: 0 0 5px 0; font-size: 10px;">123 Enterprise Blvd, Suite 100</p>
              <p style="margin: 0 0 5px 0; font-size: 10px;">Tel: +1 (555) 019-2834</p>
            </div>
            <div class="dashed"></div>
            <div class="flex"><span>Invoice:</span><span class="bold">${invoiceNumber}</span></div>
            <div class="flex"><span>Cashier:</span><span>${cashierName}</span></div>
            <div class="flex"><span>Date:</span><span>${new Date().toLocaleString()}</span></div>
            <div class="dashed"></div>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${items
                  .map(
                    (i) => `
                  <tr>
                    <td>${i.name}</td>
                    <td style="text-align: center;">${i.quantity}</td>
                    <td style="text-align: right;">$${(i.price * i.quantity).toFixed(2)}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
            <div class="dashed"></div>
            <div class="flex"><span>Subtotal:</span><span>$${(total - discount).toFixed(2)}</span></div>
            <div class="flex"><span>Tax (8.25%):</span><span>$${tax.toFixed(2)}</span></div>
            ${serviceCharge > 0 ? `<div class="flex"><span>Service Charge:</span><span>$${serviceCharge.toFixed(2)}</span></div>` : ""}
            <div class="flex bold"><span>Grand Total:</span><span>$${(total + tax - discount + serviceCharge).toFixed(2)}</span></div>
            <div class="dashed"></div>
            <p class="bold" style="margin: 0 0 4px 0; font-size: 11px;">Payments splits:</p>
            ${
              payments.length > 0
                ? payments.map((p) => `<div class="flex"><span>${p.method}:</span><span>$${p.amount.toFixed(2)}</span></div>`).join("")
                : `<div class="flex"><span>CASH:</span><span>$${(total + tax - discount + serviceCharge).toFixed(2)}</span></div>`
            }
            <div class="dashed"></div>
            <div class="center" style="font-size: 10px; margin-top: 15px;">
              <p>Thank you for shopping with us!</p>
              <p>Powered by Apex POS ERP</p>
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

  const handlePrintKOT = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print KOT - ${invoiceNumber}</title>
            <style>
              body {
                font-family: 'Courier New', Courier, monospace;
                padding: 10px;
                width: 280px;
                font-size: 12px;
                color: #000;
              }
              .center { text-align: center; }
              .dashed { border-top: 2px dashed #000; margin: 8px 0; }
              .flex { display: flex; justify-content: space-between; }
              .bold { font-weight: bold; }
              table { width: 100%; font-size: 12px; }
              th { text-align: left; }
            </style>
          </head>
          <body>
            <div class="center">
              <h2 style="margin: 0 0 5px 0;">KITCHEN ORDER TICKET</h2>
              <p style="font-size: 10px;">Date: ${new Date().toLocaleString()}</p>
            </div>
            <div class="dashed"></div>
            <div class="flex"><span>KOT Ref:</span><span class="bold">${invoiceNumber}</span></div>
            <div class="flex"><span>Cashier:</span><span>${cashierName}</span></div>
            <div class="dashed"></div>
            <table>
              <thead>
                <tr>
                  <th>Instruction / Item</th>
                  <th style="text-align: right; padding-right: 10px;">Qty</th>
                </tr>
              </thead>
              <tbody>
                ${items
                  .map(
                    (i) => `
                  <tr>
                    <td class="bold">${i.name}</td>
                    <td style="text-align: right; padding-right: 10px; font-size: 14px; font-weight: bold;">${i.quantity}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
            <div class="dashed"></div>
            <div class="center" style="font-size: 10px; margin-top: 15px;">
              <p>** Keep Kitchen Clean **</p>
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
      <div className="bg-card w-full max-w-lg border rounded-xl shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4.5 w-4.5" />
        </button>

        <h2 className="text-lg font-bold mb-1">Receipt Preview</h2>
        <p className="text-xs text-muted-foreground mb-6">Choose to print thermal receipts or Kitchen Tickets (KOT)</p>

        {/* Paper visual wrap */}
        <div className="bg-white text-black p-6 border rounded-xl font-mono text-xs max-h-[300px] overflow-y-auto shadow-inner mb-6">
          <div className="text-center mb-4">
            <h3 className="text-sm font-bold">Cafe Chai POS</h3>
            <p className="text-[10px] text-gray-500">123 Enterprise Blvd, Suite 100</p>
          </div>
          <div className="border-t border-dashed border-gray-400 my-2" />
          <div className="flex justify-between">
            <span>Invoice:</span>
            <span className="font-bold">{invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Cashier:</span>
            <span>{cashierName}</span>
          </div>
          <div className="border-t border-dashed border-gray-400 my-2" />
          <table className="w-full">
            <thead>
              <tr className="border-b border-dashed border-gray-400 text-left">
                <th className="pb-1">Item</th>
                <th className="pb-1 text-center">Qty</th>
                <th className="pb-1 text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="py-0.5">{i.name}</td>
                  <td className="py-0.5 text-center">{i.quantity}</td>
                  <td className="py-0.5 text-right">${(i.price * i.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-dashed border-gray-400 my-2" />
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${(total - discount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Grand Total:</span>
            <span>${(total + tax - discount + serviceCharge).toFixed(2)}</span>
          </div>
          <div className="border-t border-dashed border-gray-400 my-2" />
          <div className="text-center text-[10px] text-gray-500 mt-4">
            Thank you for shopping with us!
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={handlePrintKOT} className="flex items-center gap-1.5 justify-center">
            <FileText className="h-4 w-4" />
            <span>Print Kitchen Order (KOT)</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrintReceipt} className="flex items-center gap-1.5 justify-center">
            <Printer className="h-4 w-4" />
            <span>Print Customer Receipt</span>
          </Button>
          <Button onClick={onDone} className="justify-center">
            Complete checkout
          </Button>
        </div>
      </div>
    </div>
  );
}
