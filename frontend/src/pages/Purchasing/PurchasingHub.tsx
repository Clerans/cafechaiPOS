import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Truck,
  Trash2,
  Edit2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Drawer } from "@/components/ui/Drawer";
import { Dialog } from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import api from "@/utils/api";

interface Supplier {
  id: number;
  name: string;
  code: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}

interface PurchaseOrder {
  id: number;
  poNumber: string;
  supplierId: number;
  supplier: { name: string; code: string };
  branchId: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "RECEIVED";
  totalAmount: number;
  notes: string | null;
  creator: { firstName: string; lastName: string };
  approver?: { firstName: string; lastName: string } | null;
  items: any[];
  createdAt: string;
}

export function PurchasingHub() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<"suppliers" | "orders" | "statements">("orders");

  // Query variables
  const [supplierIdFilter, setSupplierIdFilter] = React.useState("");

  // Drawers and Modals control
  const [isSupplierDrawerOpen, setIsSupplierDrawerOpen] = React.useState(false);
  const [selectedSupplier, setSelectedSupplier] = React.useState<Supplier | null>(null);
  
  const [isPODrawerOpen, setIsPODrawerOpen] = React.useState(false);
  
  const [selectedPO, setSelectedPO] = React.useState<PurchaseOrder | null>(null);
  const [isGRNModalOpen, setIsGRNModalOpen] = React.useState(false);
  const [grnItems, setGRNItems] = React.useState<any[]>([]);

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = React.useState(false);

  // Forms states
  const [supplierForm, setSupplierForm] = React.useState({
    name: "",
    code: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
  });

  const [poForm, setPOForm] = React.useState({
    supplierId: "",
    branchId: "1", // default main
    notes: "",
    items: [{ productId: "", variantId: "", quantity: "1", costPrice: "" }],
  });

  const [paymentForm, setPaymentForm] = React.useState({
    supplierId: "",
    amount: "",
    paymentMethod: "BANK_TRANSFER",
    referenceNo: "",
  });

  // Queries
  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: () => api.get("/api/purchasing/suppliers"),
  });

  const { data: purchaseOrders, isLoading: posLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ["purchase-orders"],
    queryFn: () => api.get("/api/purchasing/orders"),
  });

  const { data: products } = useQuery<{ data: any[] }>({
    queryKey: ["pos-draft-products"],
    queryFn: () => api.get("/api/inventory/products?limit=100"),
  });

  const { data: activeStatement } = useQuery<any>({
    queryKey: ["statement", supplierIdFilter],
    queryFn: () => api.get(`/api/purchasing/suppliers/${supplierIdFilter}/statement`),
    enabled: !!supplierIdFilter,
  });

  // Mutations
  const createSupplierMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/purchasing/suppliers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setIsSupplierDrawerOpen(false);
      resetSupplierForm();
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.put(`/api/purchasing/suppliers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setIsSupplierDrawerOpen(false);
      setSelectedSupplier(null);
      resetSupplierForm();
    },
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/purchasing/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });

  const createPOMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/purchasing/orders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      setIsPODrawerOpen(false);
      resetPOForm();
    },
  });

  const approvePOMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.put(`/api/purchasing/orders/${id}/approve`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
  });

  const grnMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/purchasing/grn", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsGRNModalOpen(false);
      setSelectedPO(null);
    },
  });

  const paymentMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/purchasing/payments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["statement", supplierIdFilter] });
      setIsPaymentDialogOpen(false);
      setPaymentForm({ supplierId: "", amount: "", paymentMethod: "BANK_TRANSFER", referenceNo: "" });
    },
  });

  // Helpers
  const resetSupplierForm = () => {
    setSupplierForm({ name: "", code: "", contactName: "", email: "", phone: "", address: "" });
  };

  const resetPOForm = () => {
    setPOForm({
      supplierId: "",
      branchId: "1",
      notes: "",
      items: [{ productId: "", variantId: "", quantity: "1", costPrice: "" }],
    });
  };

  const handleEditSupplierClick = (s: Supplier) => {
    setSelectedSupplier(s);
    setSupplierForm({
      name: s.name,
      code: s.code,
      contactName: s.contactName || "",
      email: s.email || "",
      phone: s.phone || "",
      address: s.address || "",
    });
    setIsSupplierDrawerOpen(true);
  };

  const handleSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSupplier) {
      updateSupplierMutation.mutate({ id: selectedSupplier.id, data: supplierForm });
    } else {
      createSupplierMutation.mutate(supplierForm);
    }
  };

  const handlePOSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Calculate total cost amount
    const totalAmount = poForm.items.reduce((sum, item) => {
      return sum + parseInt(item.quantity || "0") * parseFloat(item.costPrice || "0");
    }, 0);

    const payload = {
      ...poForm,
      totalAmount,
      items: poForm.items.map((i) => ({
        productId: parseInt(i.productId),
        variantId: i.variantId ? parseInt(i.variantId) : null,
        quantity: parseInt(i.quantity),
        costPrice: parseFloat(i.costPrice),
      })),
    };
    createPOMutation.mutate(payload);
  };

  const handleLaunchGRN = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setGRNItems(
      po.items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        name: i.variant ? `${i.product?.name} (${i.variant?.name})` : i.product?.name,
        quantity: i.quantity,
        quantityReceived: i.quantity, // Default to full count
      }))
    );
    setIsGRNModalOpen(true);
  };

  const handleConfirmGRN = () => {
    const payload = {
      purchaseOrderId: selectedPO?.id,
      items: grnItems.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantityReceived,
      })),
    };
    grnMutation.mutate(payload);
  };

  const handleSimulateInvoiceUpload = () => {
    alert("Simulated PDF Invoice upload: File attached successfully to PO context");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Purchasing & Suppliers</h1>
          <p className="text-sm text-muted-foreground">Draft purchase orders, log Goods Received Notes, and track vendor statements.</p>
        </div>

        <div className="flex gap-2">
          {activeTab === "suppliers" && (
            <Button size="sm" onClick={() => { setSelectedSupplier(null); resetSupplierForm(); setIsSupplierDrawerOpen(true); }} className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Add Supplier</span>
            </Button>
          )}
          {activeTab === "orders" && (
            <Button size="sm" onClick={() => { resetPOForm(); setIsPODrawerOpen(true); }} className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Draft PO Order</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b gap-2 overflow-x-auto scrollbar-none">
        {(["orders", "suppliers", "statements"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 capitalize transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "orders" ? "Purchase Orders" : tab === "statements" ? "Vendor Ledger Statements" : tab}
          </button>
        ))}
      </div>

      {/* 1. Purchase Orders Tab */}
      {activeTab === "orders" && (
        <Card>
          <CardContent className="p-0">
            {posLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">Loading purchase orders history...</div>
            ) : purchaseOrders && purchaseOrders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Reference</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map((po) => {
                    const statusColors = {
                      PENDING: "bg-amber-500/10 text-amber-600 border-amber-500/20",
                      APPROVED: "bg-blue-500/10 text-blue-600 border-blue-500/20",
                      REJECTED: "bg-destructive/10 text-destructive border-destructive/20",
                      RECEIVED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                    };
                    return (
                      <TableRow key={po.id}>
                        <TableCell className="font-mono text-xs font-bold text-primary">
                          <span className="block">{po.poNumber}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(po.createdAt).toLocaleDateString()}</span>
                        </TableCell>
                        <TableCell className="text-xs font-semibold">{po.supplier?.name}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-bold">${po.totalAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[po.status]} border text-[9px]`}>{po.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {po.creator?.firstName} {po.creator?.lastName}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button variant="outline" size="sm" onClick={handleSimulateInvoiceUpload} title="Attach scan invoice copy">
                              Upload Invoice
                            </Button>
                            {po.status === "PENDING" && (
                              <>
                                <Button variant="outline" size="sm" onClick={() => approvePOMutation.mutate({ id: po.id, status: "APPROVED" })} className="text-blue-500 hover:bg-blue-50">
                                  Approve
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => approvePOMutation.mutate({ id: po.id, status: "REJECTED" })} className="text-destructive hover:bg-red-50">
                                  Reject
                                </Button>
                              </>
                            )}
                            {po.status === "APPROVED" && (
                              <Button variant="outline" size="sm" onClick={() => handleLaunchGRN(po)} className="text-emerald-600 hover:bg-emerald-50">
                                Receive Goods (GRN)
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">No purchase records requested yet.</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 2. Suppliers CRUD Tab */}
      {activeTab === "suppliers" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {suppliers && suppliers.length > 0 ? (
            suppliers.map((s) => (
              <Card key={s.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-sm font-bold">{s.name}</CardTitle>
                      <CardDescription className="text-[10px] font-mono">{s.code}</CardDescription>
                    </div>
                    <Truck className="h-4.5 w-4.5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Contact:</span>
                      <span className="font-semibold text-foreground">{s.contactName || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Phone:</span>
                      <span className="font-semibold text-foreground">{s.phone || "N/A"}</span>
                    </div>
                    <div className="flex justify-between truncate">
                      <span>Email:</span>
                      <span className="font-semibold text-foreground">{s.email || "N/A"}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2 border-t justify-end">
                    <Button variant="outline" size="icon" onClick={() => handleEditSupplierClick(s)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => deleteSupplierMutation.mutate(s.id)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-xs text-muted-foreground bg-card border rounded-xl">
              No registered suppliers yet.
            </div>
          )}
        </div>
      )}

      {/* 3. Vendor Ledger Statements Tab */}
      {activeTab === "statements" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3 items-center bg-card p-4 rounded-xl border">
            <span className="text-xs font-bold shrink-0">Select Supplier Statement:</span>
            <Select
              options={[
                { label: "-- Select Supplier --", value: "" },
                ...(suppliers || []).map((s) => ({ label: s.name, value: s.id.toString() })),
              ]}
              value={supplierIdFilter}
              onChange={(e) => setSupplierIdFilter(e.target.value)}
              className="h-9 w-60"
            />
            {supplierIdFilter && (
              <Button size="sm" onClick={() => setIsPaymentDialogOpen(true)} className="sm:ml-auto">
                Record Payment
              </Button>
            )}
          </div>

          {supplierIdFilter && activeStatement ? (
            <div className="grid gap-6 md:grid-cols-3">
              {/* Balances widgets */}
              <div className="col-span-1 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-bold">Ledger Balance Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs font-medium">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Total Invoiced purchases</span>
                      <span>${activeStatement.summary.totalPurchased.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Total Paid to Supplier</span>
                      <span className="text-emerald-600">${activeStatement.summary.totalPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="text-primary font-bold">Outstanding Balance Due</span>
                      <span className="font-bold text-destructive">${activeStatement.summary.balance.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Transactions logs table */}
              <div className="col-span-1 md:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-bold">Statement Logs</CardTitle>
                    <CardDescription>Chronological purchase and payment lines</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Reference / Type</TableHead>
                          <TableHead className="text-right">Debit (+)</TableHead>
                          <TableHead className="text-right">Credit (-)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Map POs as Debits and Payments as Credits */}
                        {[
                          ...activeStatement.orders.map((o: any) => ({
                            date: o.createdAt,
                            ref: o.poNumber,
                            type: "Purchase Order",
                            debit: o.totalAmount,
                            credit: 0,
                          })),
                          ...activeStatement.payments.map((p: any) => ({
                            date: p.createdAt,
                            ref: p.paymentNumber,
                            type: `Payment (${p.paymentMethod})`,
                            debit: 0,
                            credit: p.amount,
                          })),
                        ]
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((line, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-xs text-muted-foreground">
                                {new Date(line.date).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-xs font-semibold">
                                <span className="block">{line.type}</span>
                                <span className="text-[10px] font-mono text-muted-foreground">{line.ref}</span>
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs text-destructive">
                                {line.debit > 0 ? `+$${line.debit.toFixed(2)}` : "-"}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs text-emerald-600">
                                {line.credit > 0 ? `-$${line.credit.toFixed(2)}` : "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground bg-card border rounded-xl">
              Choose a supplier account statement above to audit invoices.
            </div>
          )}
        </div>
      )}

      {/* DRAWERS: Supplier CRUD */}
      <Drawer
        isOpen={isSupplierDrawerOpen}
        onClose={() => setIsSupplierDrawerOpen(false)}
        title={selectedSupplier ? "Update Supplier Record" : "Add Supplier Account"}
      >
        <form onSubmit={handleSupplierSubmit} className="p-4 space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold">Supplier Name</label>
            <Input
              value={supplierForm.name}
              onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
              placeholder="e.g. Coffee Bean Distributors"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold">Supplier Code</label>
            <Input
              value={supplierForm.code}
              onChange={(e) => setSupplierForm({ ...supplierForm, code: e.target.value })}
              placeholder="e.g. SUP-COFFEE"
              required
              disabled={!!selectedSupplier}
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold">Contact Name</label>
            <Input
              value={supplierForm.contactName}
              onChange={(e) => setSupplierForm({ ...supplierForm, contactName: e.target.value })}
              placeholder="e.g. Robert Smith"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold">Email Address</label>
            <Input
              type="email"
              value={supplierForm.email}
              onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
              placeholder="e.g. orders@coffeebean.com"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold">Phone Number</label>
            <Input
              value={supplierForm.phone}
              onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
              placeholder="e.g. +1 (555) 012-3490"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold">Supplier Office Address</label>
            <Input
              value={supplierForm.address}
              onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
              placeholder="e.g. 74 Vendor St, Portland OR"
            />
          </div>
          <div className="pt-4">
            <Button type="submit" className="w-full" isLoading={createSupplierMutation.isPending || updateSupplierMutation.isPending}>
              {selectedSupplier ? "Update Account" : "Create Account"}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* DRAWERS: Purchase Order drafting */}
      <Drawer
        isOpen={isPODrawerOpen}
        onClose={() => setIsPODrawerOpen(false)}
        title="Draft Purchase Order (PO)"
      >
        <form onSubmit={handlePOSubmit} className="p-4 space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold">Supplier Vendor</label>
            <Select
              options={[
                { label: "-- Select Supplier --", value: "" },
                ...(suppliers || []).map((s) => ({ label: s.name, value: s.id.toString() })),
              ]}
              value={poForm.supplierId}
              onChange={(e) => setPOForm({ ...poForm, supplierId: e.target.value })}
              required
              className="w-full"
            />
          </div>

          <div className="space-y-3">
            <label className="font-bold block border-b pb-1">Order Items list</label>
            {poForm.items.map((item, idx) => (
              <div key={idx} className="border p-3 rounded-lg bg-accent/10 space-y-2 relative">
                {poForm.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...poForm.items];
                      next.splice(idx, 1);
                      setPOForm({ ...poForm, items: next });
                    }}
                    className="absolute top-2 right-2 text-destructive font-bold text-[10px]"
                  >
                    Remove
                  </button>
                )}
                <div className="space-y-1">
                  <label className="font-semibold">Select Product</label>
                  <Select
                    options={[
                      { label: "-- Select Item --", value: "" },
                      ...(products?.data || []).map((p) => ({ label: p.name, value: p.id.toString() })),
                    ]}
                    value={item.productId}
                    onChange={(e) => {
                      const next = [...poForm.items];
                      next[idx].productId = e.target.value;
                      // Pre-fill variant mapping list if applicable
                      setPOForm({ ...poForm, items: next });
                    }}
                    required
                    className="w-full"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-semibold">Quantity</label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => {
                        const next = [...poForm.items];
                        next[idx].quantity = e.target.value;
                        setPOForm({ ...poForm, items: next });
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold">Cost Price</label>
                    <Input
                      type="number"
                      value={item.costPrice}
                      onChange={(e) => {
                        const next = [...poForm.items];
                        next[idx].costPrice = e.target.value;
                        setPOForm({ ...poForm, items: next });
                      }}
                      required
                      placeholder="e.g. 5.50"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setPOForm({
                  ...poForm,
                  items: [...poForm.items, { productId: "", variantId: "", quantity: "1", costPrice: "" }],
                })
              }
              className="w-full"
            >
              + Add Item Line
            </Button>
          </div>

          <div className="space-y-1">
            <label className="font-bold">Instructions / Internal Notes</label>
            <Input
              value={poForm.notes}
              onChange={(e) => setPOForm({ ...poForm, notes: e.target.value })}
              placeholder="e.g. Fragile transit instructions"
            />
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full" isLoading={createPOMutation.isPending}>
              Submit PO Request
            </Button>
          </div>
        </form>
      </Drawer>

      {/* DIALOGS: Goods Received Note check-ins */}
      <Dialog isOpen={isGRNModalOpen} onClose={() => setIsGRNModalOpen(false)} title="Verify Received Shipment (GRN)">
        <div className="space-y-4 text-xs">
          <p className="text-muted-foreground">Verify item quantities received matching PO orders. Unconfirmed deltas will record partial state.</p>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {grnItems.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center border-b pb-2">
                <div>
                  <span className="font-bold block">{item.name}</span>
                  <span className="text-[10px] text-muted-foreground">Ordered count: {item.quantity} units</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Received:</span>
                  <Input
                    type="number"
                    value={item.quantityReceived}
                    onChange={(e) => {
                      const next = [...grnItems];
                      next[idx].quantityReceived = parseInt(e.target.value || "0");
                      setGRNItems(next);
                    }}
                    className="w-20 h-8"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" size="sm" onClick={() => setIsGRNModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmGRN} isLoading={grnMutation.isPending}>
              Log Goods Inward (GRN)
            </Button>
          </div>
        </div>
      </Dialog>

      {/* DIALOGS: record payments */}
      <Dialog isOpen={isPaymentDialogOpen} onClose={() => setIsPaymentDialogOpen(false)} title="Record Supplier Payment">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            paymentMutation.mutate({
              ...paymentForm,
              supplierId: parseInt(supplierIdFilter),
            });
          }}
          className="space-y-4 text-xs"
        >
          <div className="space-y-1">
            <label className="font-bold">Payment Amount ($)</label>
            <Input
              type="number"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              required
              placeholder="e.g. 500.00"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold">Payment Method</label>
            <Select
              options={[
                { label: "Bank Wire Transfer", value: "BANK_TRANSFER" },
                { label: "Cash Payment", value: "CASH" },
                { label: "Credit Card", value: "CARD" },
              ]}
              value={paymentForm.paymentMethod}
              onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
              className="w-full"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold">Reference / Transaction hash</label>
            <Input
              value={paymentForm.referenceNo}
              onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
              placeholder="e.g. TXN-9028301"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={paymentMutation.isPending}>
              Commit Ledger Entry
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
export default PurchasingHub;
