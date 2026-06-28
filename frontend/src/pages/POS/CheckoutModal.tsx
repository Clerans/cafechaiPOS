import * as React from "react";
import { ArrowRight, Ticket } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface PaymentLine {
  method: "CASH" | "CARD" | "BANK_TRANSFER" | "QR_PAYMENT" | "GIFT_CARD" | "STORE_CREDIT";
  amount: number;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  tax: number;
  discount: number;
  onConfirm: (payload: { payments: PaymentLine[]; couponCode: string; discountAmount: number }) => void;
  isPending?: boolean;
}

export function CheckoutModal({
  isOpen,
  onClose,
  total,
  tax,
  discount: initialDiscount,
  onConfirm,
  isPending,
}: CheckoutModalProps) {
  if (!isOpen) return null;

  // Coupon variables
  const [coupon, setCoupon] = React.useState("");
  const [discountAmount, setDiscountAmount] = React.useState(initialDiscount);
  const [couponFeedback, setCouponFeedback] = React.useState("");

  // Payment variables
  const [payments, setPayments] = React.useState<PaymentLine[]>([]);
  const [activeMethod, setActiveMethod] = React.useState<PaymentLine["method"]>("CASH");
  const [typedAmount, setTypedAmount] = React.useState("");

  const finalTotal = Math.max(0, total + tax - discountAmount);
  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const remainingDue = Math.max(0, finalTotal - totalPaid);
  const changeDue = totalPaid > finalTotal ? totalPaid - finalTotal : 0;

  // Touch friendly keypad handler
  const handleKeypadPress = (val: string) => {
    if (val === "C") {
      setTypedAmount("");
    } else if (val === "Exact") {
      setTypedAmount(remainingDue.toFixed(2));
    } else if (val === ".") {
      if (!typedAmount.includes(".")) {
        setTypedAmount(typedAmount + ".");
      }
    } else {
      setTypedAmount(typedAmount + val);
    }
  };

  const handleAddPayment = () => {
    const amt = parseFloat(typedAmount || "0");
    if (amt <= 0) return;

    // Merge payment method if it already exists
    const next = [...payments];
    const existing = next.find((p) => p.method === activeMethod);
    if (existing) {
      existing.amount = parseFloat((existing.amount + amt).toFixed(2));
    } else {
      next.push({ method: activeMethod, amount: amt });
    }

    setPayments(next);
    setTypedAmount("");
  };

  const handleClearPayments = () => {
    setPayments([]);
  };

  // Mock coupon logic
  const handleApplyCoupon = () => {
    if (coupon.toUpperCase() === "SAVE10") {
      const disc = parseFloat((total * 0.1).toFixed(2));
      setDiscountAmount(disc);
      setCouponFeedback("Coupon SAVE10 applied: 10% discount");
    } else if (coupon.toUpperCase() === "WELCOME5") {
      setDiscountAmount(5.0);
      setCouponFeedback("Coupon WELCOME5 applied: $5.00 discount");
    } else {
      setDiscountAmount(initialDiscount);
      setCouponFeedback("Invalid coupon code");
    }
  };

  const handleSubmit = () => {
    if (totalPaid < finalTotal) {
      alert("Remaining balance is still unpaid");
      return;
    }

    onConfirm({
      payments,
      couponCode: coupon,
      discountAmount,
    });
  };

  const methods: { label: string; value: PaymentLine["method"] }[] = [
    { label: "Cash Payment", value: "CASH" },
    { label: "Credit Card", value: "CARD" },
    { label: "Bank Transfer", value: "BANK_TRANSFER" },
    { label: "QR Scanner Pay", value: "QR_PAYMENT" },
    { label: "Gift Voucher Card", value: "GIFT_CARD" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-card w-full max-w-4xl border rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[650px]">
        {/* Left Side: split panels payments config */}
        <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto border-r">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold">Split Payments Checkout</h2>
              <p className="text-xs text-muted-foreground">Apply coupon discounts and split tender payments</p>
            </div>

            {/* Total display panel */}
            <div className="grid grid-cols-2 gap-3 bg-accent/20 p-4 rounded-xl border">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Cart Total</span>
                <div className="text-base font-bold">${total.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Tax (8.25%)</span>
                <div className="text-base font-bold">${tax.toFixed(2)}</div>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Discounts</span>
                <div className="text-base font-bold text-emerald-600">-${discountAmount.toFixed(2)}</div>
              </div>
              <div className="border-t pt-1 col-span-2">
                <span className="text-[10px] text-primary uppercase font-extrabold tracking-wider">Grand Total due</span>
                <div className="text-2xl font-black text-primary">${finalTotal.toFixed(2)}</div>
              </div>
            </div>

            {/* Coupons panel */}
            <div className="space-y-1">
              <label className="text-xs font-bold flex items-center gap-1">
                <Ticket className="h-3.5 w-3.5" /> Coupon Code
              </label>
              <div className="flex gap-2">
                <Input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  placeholder="e.g. SAVE10 (10% off)"
                  className="h-9"
                />
                <Button variant="outline" size="sm" onClick={handleApplyCoupon}>
                  Apply
                </Button>
              </div>
              {couponFeedback && (
                <p className="text-[10px] text-muted-foreground font-semibold italic">{couponFeedback}</p>
              )}
            </div>

            {/* Select Method */}
            <div className="space-y-1">
              <label className="text-xs font-bold">Tender Method</label>
              <div className="grid grid-cols-3 gap-2">
                {methods.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setActiveMethod(m.value)}
                    className={`p-2 border rounded-lg text-xs font-bold transition-all text-center ${
                      activeMethod === m.value
                        ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20"
                        : "bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button variant="outline" size="sm" onClick={onClose} className="w-full">
              Close Checkout
            </Button>
          </div>
        </div>

        {/* Right Side: keypad interface */}
        <div className="w-full md:w-[380px] bg-accent/10 p-6 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            {/* Split totals readout */}
            <div className="space-y-2 bg-card p-4 rounded-xl border">
              <div className="flex justify-between text-xs border-b pb-1">
                <span className="text-muted-foreground">Total Tendered</span>
                <span className="font-mono font-bold">${totalPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs border-b pb-1">
                <span className="text-muted-foreground">Remaining Due</span>
                <span className="font-mono font-bold text-primary">${remainingDue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Change Due</span>
                <span className="font-mono font-bold text-emerald-600">${changeDue.toFixed(2)}</span>
              </div>
            </div>

            {/* Input display */}
            <div className="relative">
              <Input
                type="number"
                value={typedAmount}
                onChange={(e) => setTypedAmount(e.target.value)}
                placeholder="Enter amount..."
                className="text-right text-lg font-bold pr-14"
              />
              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-bold">{activeMethod}</span>
            </div>

            {/* Keypad Grid */}
            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", ".", "C"].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKeypadPress(key)}
                  className="h-12 border bg-card rounded-lg text-sm font-bold active:bg-accent/40 transition-colors"
                >
                  {key}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleKeypadPress("Exact")}
                className="col-span-3 h-10 border bg-primary/10 text-primary rounded-lg text-xs font-extrabold active:bg-primary/20 transition-colors"
              >
                Exact Balance Due
              </button>
            </div>

            {/* Add payment btn */}
            <div className="flex gap-2">
              <Button onClick={handleAddPayment} className="flex-1 h-10">
                Record Payment
              </Button>
              {payments.length > 0 && (
                <Button variant="outline" onClick={handleClearPayments} className="h-10 text-destructive border-destructive/20 hover:bg-destructive/10">
                  Reset Split
                </Button>
              )}
            </div>
          </div>

          <div className="pt-4 border-t mt-4">
            {/* Confirm Transaction btn */}
            <Button
              onClick={handleSubmit}
              disabled={totalPaid < finalTotal}
              isLoading={isPending}
              className="w-full flex items-center justify-center gap-2 h-11 text-base font-black shadow-lg"
            >
              <span>Confirm Checkout</span>
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
