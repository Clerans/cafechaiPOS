import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  ShoppingCart,
  Trash2,
  UserCheck,
  Star,
  X,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CheckoutModal } from "./CheckoutModal";
import { ReceiptPrintModal } from "./ReceiptPrintModal";
import api from "@/utils/api";

interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  threshold: number;
  categoryId: number;
  category: { name: string };
  brand: { name: string } | null;
  unit: { name: string } | null;
  variants: any[];
}

interface CartItem {
  id: number; // product id or variant id
  productId: number;
  variantId: number | null;
  name: string;
  sku: string;
  price: number;
  cost: number;
  quantity: number;
}

export function POSScreen() {
  const queryClient = useQueryClient();
  const [cart, setCart] = React.useState<CartItem[]>(() => {
    const saved = localStorage.getItem("pos_cart");
    return saved ? JSON.parse(saved) : [];
  });

  // Save cart to local storage on changes
  React.useEffect(() => {
    localStorage.setItem("pos_cart", JSON.stringify(cart));
  }, [cart]);

  // POS State variables
  const [search, setSearch] = React.useState("");
  const [catFilter, setCatFilter] = React.useState("");
  const [discount, setDiscount] = React.useState(0);
  const [serviceCharge, setServiceCharge] = React.useState(0);
  const [notes, setNotes] = React.useState("");
  const [customerId, setCustomerId] = React.useState("");
  const [favoritesOnly, setFavoritesOnly] = React.useState(false);

  // Modal control variables
  const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false);
  const [isPrintOpen, setIsPrintOpen] = React.useState(false);
  const [isResumeOpen, setIsResumeOpen] = React.useState(false);
  const [activeInvoice, setActiveInvoice] = React.useState("");
  const [activePayments, setActivePayments] = React.useState<any[]>([]);

  // Variant helper variable
  const [variantSelectorProduct, setVariantSelectorProduct] = React.useState<Product | null>(null);

  // Queries
  const { data: products } = useQuery<{ data: Product[] }>({
    queryKey: ["pos-products", search, catFilter],
    queryFn: () => api.get(`/api/inventory/products?search=${search}&categoryId=${catFilter}&limit=40`),
  });

  const { data: customers } = useQuery<any[]>({
    queryKey: ["pos-customers"],
    queryFn: () => api.get("/api/users"), // User lists fallback
  });

  const { data: heldOrders } = useQuery<any[]>({
    queryKey: ["pos-held"],
    queryFn: () => api.get("/api/pos/held"),
  });

  // Mutations
  const checkoutMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/pos/checkout", data),
    onSuccess: (res: any) => {
      setActiveInvoice(res.invoiceNumber);
      setActivePayments(res.payments || []);
      setIsCheckoutOpen(false);
      setIsPrintOpen(true);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["pos-held"] });
    },
  });

  const holdMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/pos/hold", data),
    onSuccess: () => {
      setCart([]);
      setDiscount(0);
      setServiceCharge(0);
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["pos-held"] });
      alert("Order placed on hold");
    },
  });

  const deleteHeldMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/pos/held/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pos-held"] });
    },
  });

  // Barcode / Scanner simulation
  React.useEffect(() => {
    let scannedChars = "";
    let lastKeyTime = Date.now();

    const handleKeyPress = (e: KeyboardEvent) => {
      const now = Date.now();
      if (now - lastKeyTime > 200) {
        scannedChars = "";
      }
      lastKeyTime = now;

      if (e.key === "Enter") {
        if (scannedChars.length > 3) {
          handleBarcodeScanned(scannedChars);
          scannedChars = "";
        }
      } else if (e.key !== "Shift" && e.key !== "Control" && e.key !== "Alt") {
        scannedChars += e.key;
      }
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => window.removeEventListener("keypress", handleKeyPress);
  }, [products, cart]);

  // Keyboard Shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F8") {
        e.preventDefault();
        if (cart.length > 0) setIsCheckoutOpen(true);
      } else if (e.key === "F9") {
        e.preventDefault();
        handleHoldOrder();
      } else if (e.key === "F10") {
        e.preventDefault();
        const el = document.getElementById("pos-search-input");
        if (el) el.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart]);

  const handleBarcodeScanned = (code: string) => {
    if (!products?.data) return;
    // Look up product by SKU or barcode, or variant by SKU/barcode
    for (const p of products.data) {
      if (p.sku === code) {
        handleAddToCart(p);
        return;
      }
      for (const v of p.variants) {
        if (v.sku === code || v.barcode === code) {
          handleVariantSelect(p, v);
          return;
        }
      }
    }
  };

  // Cart operations
  const handleAddToCart = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setVariantSelectorProduct(product);
      return;
    }

    const next = [...cart];
    const existing = next.find((item) => item.productId === product.id && item.variantId === null);
    if (existing) {
      existing.quantity += 1;
    } else {
      next.push({
        id: product.id,
        productId: product.id,
        variantId: null,
        name: product.name,
        sku: product.sku,
        price: product.price,
        cost: product.cost,
        quantity: 1,
      });
    }
    setCart(next);
  };

  const handleVariantSelect = (product: Product, variant: any) => {
    const next = [...cart];
    const existing = next.find((item) => item.variantId === variant.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      next.push({
        id: variant.id,
        productId: product.id,
        variantId: variant.id,
        name: `${product.name} (${variant.name})`,
        sku: variant.sku,
        price: variant.price,
        cost: variant.cost,
        quantity: 1,
      });
    }
    setCart(next);
    setVariantSelectorProduct(null);
  };

  const handleUpdateQty = (itemId: number, isVariant: boolean, delta: number) => {
    const next = cart
      .map((item) => {
        if (isVariant ? item.variantId === itemId : item.productId === itemId && item.variantId === null) {
          const qty = item.quantity + delta;
          return { ...item, quantity: qty };
        }
        return item;
      })
      .filter((item) => item.quantity > 0);
    setCart(next);
  };

  const handleRemoveFromCart = (itemId: number, isVariant: boolean) => {
    const next = cart.filter((item) =>
      isVariant ? item.variantId !== itemId : !(item.productId === itemId && item.variantId === null)
    );
    setCart(next);
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscount(0);
    setServiceCharge(0);
    setNotes("");
  };

  // Calculations
  const subtotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const taxRate = 8.25;
  const tax = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
  const finalTotal = subtotal + tax - discount + serviceCharge;

  // Checkout confirmation
  const handleConfirmCheckout = (payload: { payments: any[]; couponCode: string; discountAmount: number }) => {
    const checkoutPayload = {
      customerId: customerId ? parseInt(customerId) : null,
      branchId: 1, // HQ Main Default
      total: finalTotal,
      tax,
      discount: payload.discountAmount,
      serviceCharge,
      couponCode: payload.couponCode,
      paymentMethod: payload.payments.length > 1 ? "SPLIT" : payload.payments[0]?.method || "CASH",
      payments: payload.payments,
      items: cart.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
        price: i.price,
        cost: i.cost,
      })),
    };
    checkoutMutation.mutate(checkoutPayload);
  };

  // Hold / Resume Order operations
  const handleHoldOrder = () => {
    if (cart.length === 0) return;
    const holdPayload = {
      notes,
      tax,
      discount,
      serviceCharge,
      total: finalTotal,
      customerId: customerId ? parseInt(customerId) : null,
      branchId: 1, // HQ Main Default
      items: cart.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
        price: i.price,
        cost: i.cost,
      })),
    };
    holdMutation.mutate(holdPayload);
  };

  const handleResumeOrder = (held: any) => {
    // Restore items to cart
    const restored = held.items.map((item: any) => ({
      id: item.variantId || item.productId,
      productId: item.productId,
      variantId: item.variantId,
      name: item.variantId ? `${item.product?.name} (Variant)` : item.product?.name || "Product",
      sku: item.variantId ? "VAR-SKU" : "SKU",
      price: item.price,
      cost: item.cost,
      quantity: item.quantity,
    }));
    setCart(restored);
    setDiscount(held.discount);
    setServiceCharge(held.serviceCharge);
    setNotes(held.notes || "");
    deleteHeldMutation.mutate(held.id);
    setIsResumeOpen(false);
  };

  const categories = [
    { label: "All Items", value: "" },
    { label: "Beverages", value: "1" },
    { label: "Espresso", value: "2" },
    { label: "Bakery", value: "3" },
    { label: "Sandwiches", value: "4" },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)] min-h-[500px]">
      {/* LEFT COLUMN: Product Selector Grid */}
      <div className="flex-1 flex flex-col justify-between space-y-4">
        {/* Controls menu bar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-card p-4 rounded-xl border">
          <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="pos-search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Scan or Search (F10)..."
                className="pl-9 h-9"
              />
            </div>
            <button
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              className={`h-9 px-3 border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                favoritesOnly
                  ? "bg-amber-500/10 border-amber-500 text-amber-500"
                  : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              <Star className="h-3.5 w-3.5 fill-current" />
              <span>Favorites</span>
            </button>
          </div>

          <div className="flex border-b overflow-x-auto gap-1 w-full sm:w-auto shrink-0 scrollbar-none pb-2 sm:pb-0">
            {categories.map((c) => (
              <button
                key={c.value}
                onClick={() => setCatFilter(c.value)}
                className={`px-3 py-1.5 text-xs font-bold border-b-2 transition-colors ${
                  catFilter === c.value
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Products cards grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {products?.data && products.data.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.data.map((p) => {
                const isLow = p.stock <= p.threshold;
                return (
                  <Card
                    key={p.id}
                    onClick={() => handleAddToCart(p)}
                    className={`hover:shadow-md cursor-pointer transition-all active:scale-[0.98] select-none ${
                      isLow ? "border-amber-500/25 bg-amber-500/[0.02]" : "bg-card"
                    }`}
                  >
                    <CardContent className="p-4 flex flex-col justify-between h-28 relative">
                      {isLow && (
                        <span className="absolute top-2 right-2 bg-amber-500/10 text-amber-500 p-0.5 rounded-full" title="Low stock warning">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        </span>
                      )}
                      <div>
                        <h3 className="text-xs font-bold text-foreground leading-tight line-clamp-2">{p.name}</h3>
                        <span className="text-[9px] text-muted-foreground font-mono">{p.sku}</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs font-black text-primary">${p.price.toFixed(2)}</span>
                        <span className="text-[9px] text-muted-foreground font-medium">Stock: {p.stock}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground bg-card rounded-xl border">
              No products found in category.
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Checkout Cart Pane */}
      <div className="w-full lg:w-[420px] bg-card border rounded-xl shadow-sm flex flex-col overflow-hidden h-full">
        {/* Cart Header */}
        <div className="p-4 border-b flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4.5 w-4.5 text-primary" />
            <span className="font-bold text-sm">Cart Items ({cart.length})</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClearCart} className="text-destructive font-semibold text-xs hover:bg-destructive/10">
            Clear Cart
          </Button>
        </div>

        {/* Customer select */}
        <div className="p-4 border-b shrink-0 bg-accent/10 flex items-center gap-2">
          <UserCheck className="h-4.5 w-4.5 text-primary shrink-0" />
          <Select
            options={[
              { label: "Walk-in Customer", value: "" },
              ...(customers || []).map((c) => ({ label: `${c.firstName} ${c.lastName}`, value: c.id.toString() })),
            ]}
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="h-8 py-0.5 text-xs flex-1"
          />
        </div>

        {/* Cart Item rows list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length > 0 ? (
            cart.map((item) => (
              <div key={item.id} className="flex justify-between items-start gap-4 border-b pb-3 last:border-0 last:pb-0">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold leading-tight">{item.name}</h4>
                  <p className="text-[10px] text-muted-foreground font-mono font-semibold">${item.price.toFixed(2)}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex border rounded-lg overflow-hidden h-7 bg-background items-center shrink-0">
                    <button
                      onClick={() => handleUpdateQty(item.productId, item.variantId !== null, -1)}
                      className="px-2 hover:bg-muted text-xs font-bold h-full"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-xs font-mono font-bold">{item.quantity}</span>
                    <button
                      onClick={() => handleUpdateQty(item.productId, item.variantId !== null, 1)}
                      className="px-2 hover:bg-muted text-xs font-bold h-full"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemoveFromCart(item.productId, item.variantId !== null)}
                    className="p-1 text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <ShoppingCart className="h-8 w-8 opacity-30" />
              <span className="text-xs font-medium">Add items to proceed</span>
            </div>
          )}
        </div>

        {/* Cart Summary */}
        <div className="p-4 border-t bg-accent/5 shrink-0 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service Charge</span>
              <input
                type="number"
                value={serviceCharge || ""}
                onChange={(e) => setServiceCharge(parseFloat(e.target.value || "0"))}
                className="w-16 h-5 border rounded text-right px-1 font-mono text-[11px]"
                placeholder="0.00"
              />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <input
                type="number"
                value={discount || ""}
                onChange={(e) => setDiscount(parseFloat(e.target.value || "0"))}
                className="w-16 h-5 border rounded text-right px-1 font-mono text-[11px]"
                placeholder="0.00"
              />
            </div>
            <div className="flex justify-between col-span-2 border-t pt-2">
              <span className="text-primary font-black text-sm uppercase">Total Due</span>
              <span className="font-mono font-black text-primary text-sm">${Math.max(0, finalTotal).toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground font-bold">Transaction notes</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Table 4 custom instruction"
              className="h-8 text-xs"
            />
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleHoldOrder}
              disabled={cart.length === 0}
              className="flex items-center gap-1.5 justify-center h-9 font-bold"
            >
              <span>Hold (F9)</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResumeOpen(true)}
              className="flex items-center gap-1.5 justify-center h-9 font-bold relative"
            >
              <span>Resume</span>
              {heldOrders && heldOrders.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground h-4.5 w-4.5 rounded-full text-[9px] flex items-center justify-center font-bold">
                  {heldOrders.length}
                </span>
              )}
            </Button>
            <Button
              disabled={cart.length === 0}
              onClick={() => setIsCheckoutOpen(true)}
              className="flex items-center gap-1.5 justify-center h-9 font-black"
            >
              <span>Pay (F8)</span>
            </Button>
          </div>
        </div>
      </div>

      {/* VARIANTS SELECTOR OVERLAY POPOVER */}
      {variantSelectorProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card w-full max-w-md border rounded-xl shadow-2xl p-6 relative">
            <button
              onClick={() => setVariantSelectorProduct(null)}
              className="absolute top-4 right-4 p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-base font-bold mb-1">Select Variant</h3>
            <p className="text-xs text-muted-foreground mb-4">Select variation sizes/grades for **{variantSelectorProduct.name}**</p>
            
            <div className="space-y-2 mb-6">
              {variantSelectorProduct.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleVariantSelect(variantSelectorProduct, v)}
                  className="w-full flex justify-between items-center p-3 border rounded-lg hover:bg-accent/40 text-left transition-colors"
                >
                  <span className="text-xs font-bold">{v.name}</span>
                  <span className="font-mono text-xs font-black text-primary">${v.price.toFixed(2)}</span>
                </button>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={() => setVariantSelectorProduct(null)} className="w-full">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* CHECOUT MODAL SPLIT PAYMENT keypads */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        total={subtotal}
        tax={tax}
        discount={discount}
        onConfirm={handleConfirmCheckout}
        isPending={checkoutMutation.isPending}
      />

      {/* RECEIPT MOCK PRINT MODALS */}
      <ReceiptPrintModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        invoiceNumber={activeInvoice}
        items={cart}
        total={subtotal}
        tax={tax}
        discount={discount}
        serviceCharge={serviceCharge}
        payments={activePayments}
        cashierName="John Doe"
        onDone={() => {
          setIsPrintOpen(false);
          handleClearCart();
        }}
      />

      {/* RESUME HELD ORDERS DIALOG */}
      {isResumeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-card w-full max-w-lg border rounded-xl shadow-2xl p-6 relative flex flex-col max-h-[80vh]">
            <button
              onClick={() => setIsResumeOpen(false)}
              className="absolute top-4 right-4 p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-base font-bold mb-1">Resume Held Orders</h3>
            <p className="text-xs text-muted-foreground mb-6">Select a suspended checkout session order to restore</p>

            <div className="flex-1 overflow-y-auto space-y-3">
              {heldOrders && heldOrders.length > 0 ? (
                heldOrders.map((held) => (
                  <div key={held.id} className="border p-4 rounded-xl flex justify-between items-center bg-accent/20">
                    <div>
                      <div className="text-xs font-bold text-primary font-mono">{held.invoiceNumber}</div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Items: {held.items.length} | Notes: {held.notes || "None"}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(held.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold pr-2">${held.total.toFixed(2)}</span>
                      <Button size="sm" onClick={() => handleResumeOrder(held)}>
                        Resume
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-xs py-12 text-muted-foreground">No orders currently on hold.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default POSScreen;
