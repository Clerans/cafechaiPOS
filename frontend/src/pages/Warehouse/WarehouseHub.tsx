import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Drawer } from "@/components/ui/Drawer";
import { Badge } from "@/components/ui/Badge";
import api from "@/utils/api";

interface Warehouse {
  id: number;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
}

interface WarehouseStock {
  id: number;
  warehouseId: number;
  warehouse: { name: string };
  productId: number;
  product: { name: string; sku: string; cost: number };
  variantId: number | null;
  variant: { name: string; sku: string } | null;
  quantity: number;
}

interface StockTransfer {
  id: number;
  transferNumber: string;
  fromWarehouse: { name: string };
  toWarehouse: { name: string };
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  notes: string | null;
  items: any[];
  createdAt: string;
}

export function WarehouseHub() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<"dashboard" | "stocks" | "transfers" | "production" | "damaged">("dashboard");

  // Drawer / Modals control
  const [isWarehouseDrawerOpen, setIsWarehouseDrawerOpen] = React.useState(false);
  const [isTransferDrawerOpen, setIsTransferDrawerOpen] = React.useState(false);
  const [isProductionDrawerOpen, setIsProductionDrawerOpen] = React.useState(false);
  const [isDamageDrawerOpen, setIsDamageDrawerOpen] = React.useState(false);

  // Forms states
  const [warehouseForm, setWarehouseForm] = React.useState({
    name: "",
    code: "",
    address: "",
    phone: "",
  });

  const [transferForm, setTransferForm] = React.useState({
    fromWarehouseId: "",
    toWarehouseId: "",
    notes: "",
    items: [{ productId: "", variantId: "", quantity: "1" }],
  });

  const [productionForm, setProductionForm] = React.useState({
    productId: "",
    variantId: "",
    quantity: "1",
    warehouseId: "",
  });

  const [damageForm, setDamageForm] = React.useState({
    warehouseId: "",
    productId: "",
    variantId: "",
    quantity: "1",
    reason: "",
  });

  // Queries
  const { data: stats } = useQuery<any>({
    queryKey: ["warehouse-stats"],
    queryFn: () => api.get("/api/warehouse/dashboard"),
  });

  const { data: warehouses } = useQuery<Warehouse[]>({
    queryKey: ["warehouses"],
    queryFn: () => api.get("/api/warehouse"),
  });

  const { data: stocks, isLoading: stocksLoading } = useQuery<WarehouseStock[]>({
    queryKey: ["warehouse-stocks"],
    queryFn: () => api.get("/api/warehouse/stocks"),
  });

  const { data: transfers, isLoading: transfersLoading } = useQuery<StockTransfer[]>({
    queryKey: ["stock-transfers"],
    queryFn: () => api.get("/api/warehouse/transfers"),
  });

  const { data: productionOrders } = useQuery<any[]>({
    queryKey: ["production-orders"],
    queryFn: () => api.get("/api/warehouse/production"),
  });

  const { data: damagedGoods } = useQuery<any[]>({
    queryKey: ["damaged-goods"],
    queryFn: () => api.get("/api/warehouse/damaged"),
  });

  const { data: products } = useQuery<{ data: any[] }>({
    queryKey: ["warehouse-products"],
    queryFn: () => api.get("/api/inventory/products?limit=100"),
  });

  // Mutations
  const createWarehouseMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/warehouse", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-stats"] });
      setIsWarehouseDrawerOpen(false);
      setWarehouseForm({ name: "", code: "", address: "", phone: "" });
    },
  });

  const createTransferMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/warehouse/transfers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-stats"] });
      setIsTransferDrawerOpen(false);
      setTransferForm({
        fromWarehouseId: "",
        toWarehouseId: "",
        notes: "",
        items: [{ productId: "", variantId: "", quantity: "1" }],
      });
    },
  });

  const approveTransferMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.put(`/api/warehouse/transfers/${id}/approve`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-stocks"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-stats"] });
    },
  });

  const createProductionMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/warehouse/production", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-orders"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-stocks"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-stats"] });
      setIsProductionDrawerOpen(false);
      setProductionForm({ productId: "", variantId: "", quantity: "1", warehouseId: "" });
    },
  });

  const createDamageMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/warehouse/damaged", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["damaged-goods"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-stocks"] });
      queryClient.invalidateQueries({ queryKey: ["warehouse-stats"] });
      setIsDamageDrawerOpen(false);
      setDamageForm({ warehouseId: "", productId: "", variantId: "", quantity: "1", reason: "" });
    },
  });

  // Handlers
  const handleWarehouseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createWarehouseMutation.mutate(warehouseForm);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTransferMutation.mutate(transferForm);
  };

  const handleProductionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProductionMutation.mutate(productionForm);
  };

  const handleDamageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDamageMutation.mutate(damageForm);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Warehouse & Production</h1>
          <p className="text-sm text-muted-foreground">Manage multi-warehouse stock shifts, recipe assembly runs, and logging damaged goods.</p>
        </div>

        <div className="flex gap-2">
          {activeTab === "stocks" && (
            <Button size="sm" onClick={() => setIsWarehouseDrawerOpen(true)} className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Add Warehouse</span>
            </Button>
          )}
          {activeTab === "transfers" && (
            <Button size="sm" onClick={() => setIsTransferDrawerOpen(true)} className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Draft Stock Transfer</span>
            </Button>
          )}
          {activeTab === "production" && (
            <Button size="sm" onClick={() => setIsProductionDrawerOpen(true)} className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Production Order</span>
            </Button>
          )}
          {activeTab === "damaged" && (
            <Button size="sm" onClick={() => setIsDamageDrawerOpen(true)} className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Log Damaged Goods</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b gap-2 overflow-x-auto scrollbar-none">
        {(["dashboard", "stocks", "transfers", "production", "damaged"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 capitalize transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "stocks" ? "Stocks Inventory" : tab === "transfers" ? "Stock Transfers" : tab === "production" ? "Production Runs" : tab === "damaged" ? "Damaged Goods" : tab}
          </button>
        ))}
      </div>

      {/* 1. Warehouse Dashboard */}
      {activeTab === "dashboard" && stats && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Warehouses Location count</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-primary">{stats.warehousesCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Active Shifts (Pending)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-amber-600">{stats.activeTransfersCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Production Manufacturing Runs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-blue-600">{stats.productionCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Stock Valuation (Cost value)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-emerald-600">${stats.valuation.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Recent transfers list */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Pending Stock Shifts</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {transfers && transfers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transfer Ref</TableHead>
                        <TableHead>From / To</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transfers.slice(0, 5).map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-mono text-xs font-bold text-primary">{t.transferNumber}</TableCell>
                          <TableCell className="text-xs font-medium">
                            {t.fromWarehouse?.name} → {t.toWarehouse?.name}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-amber-500/10 text-amber-600 border-0 text-[9px]">{t.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground">No active transfers pending.</div>
                )}
              </CardContent>
            </Card>

            {/* Production orders count */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Recent Assemblies (Manufacturing)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {productionOrders && productionOrders.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order Ref</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productionOrders.slice(0, 5).map((po) => (
                        <TableRow key={po.id}>
                          <TableCell className="font-mono text-xs font-bold text-primary">{po.orderNumber}</TableCell>
                          <TableCell className="text-xs font-medium">{po.product?.name}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold">{po.quantity} pcs</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground">No production conversions recorded.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 2. Warehouse Stock levels */}
      {activeTab === "stocks" && (
        <Card>
          <CardContent className="p-0">
            {stocksLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">Loading stock levels...</div>
            ) : stocks && stocks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Product Item</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Stock Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stocks.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs font-semibold">{s.warehouse?.name}</TableCell>
                      <TableCell className="text-xs font-medium">
                        {s.product?.name} {s.variant ? `(${s.variant?.name})` : ""}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {s.variant?.sku || s.product?.sku}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold">
                        {s.quantity} units
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">No warehouse stocks mapped yet. Add a warehouse or run a GRN.</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. Stock Transfers */}
      {activeTab === "transfers" && (
        <Card>
          <CardContent className="p-0">
            {transfersLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">Loading transfers history...</div>
            ) : transfers && transfers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ref Number</TableHead>
                    <TableHead>Shifting Route</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((t) => {
                    const statusColors = {
                      PENDING: "bg-amber-500/10 text-amber-600 border-amber-500/20",
                      COMPLETED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                      CANCELLED: "bg-destructive/10 text-destructive border-destructive/20",
                    };
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs font-bold text-primary">
                          <span className="block">{t.transferNumber}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</span>
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          {t.fromWarehouse?.name} → {t.toWarehouse?.name}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[t.status]} border text-[9px]`}>{t.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {t.status === "PENDING" && (
                            <div className="flex justify-end gap-1.5">
                              <Button variant="outline" size="sm" onClick={() => approveTransferMutation.mutate({ id: t.id, status: "APPROVED" })} className="text-emerald-600 hover:bg-emerald-50">
                                Approve Transfer
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => approveTransferMutation.mutate({ id: t.id, status: "CANCELLED" })} className="text-destructive hover:bg-red-50">
                                Cancel
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">No stock transfer lines recorded.</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. Production Manufacturing Orders */}
      {activeTab === "production" && (
        <Card>
          <CardContent className="p-0">
            {productionOrders && productionOrders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assembly order Number</TableHead>
                    <TableHead>Finished Product SKU</TableHead>
                    <TableHead>Storage Warehouse</TableHead>
                    <TableHead className="text-right">Assembled Qty</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productionOrders.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono text-xs font-bold text-primary">
                        <span className="block">{po.orderNumber}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(po.createdAt).toLocaleDateString()}</span>
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        <span className="block">{po.product?.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{po.product?.sku}</span>
                      </TableCell>
                      <TableCell className="text-xs">{po.warehouse?.name}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold">{po.quantity} pcs</TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px]">{po.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">No production assembly orders.</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 5. Damaged Goods tab */}
      {activeTab === "damaged" && (
        <Card>
          <CardContent className="p-0">
            {damagedGoods && damagedGoods.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Written-off count</TableHead>
                    <TableHead>Reason notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {damagedGoods.map((dg) => (
                    <TableRow key={dg.id}>
                      <TableCell className="text-xs font-semibold">{dg.warehouse?.name}</TableCell>
                      <TableCell className="text-xs font-medium">
                        {dg.product?.name} {dg.variant ? `(${dg.variant?.name})` : ""}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-destructive">
                        -{dg.quantity} pcs
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground italic">"{dg.reason || "Damaged transit"}"</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">No damaged goods write-offs.</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* DRAWERS: Warehouse locations */}
      <Drawer isOpen={isWarehouseDrawerOpen} onClose={() => setIsWarehouseDrawerOpen(false)} title="Add Warehouse storage">
        <form onSubmit={handleWarehouseSubmit} className="p-4 space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold">Warehouse Name</label>
            <Input
              value={warehouseForm.name}
              onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
              placeholder="e.g. Seattle North Warehouse"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold">Warehouse Code</label>
            <Input
              value={warehouseForm.code}
              onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })}
              placeholder="e.g. WH-SEATTLE-02"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold">Address location</label>
            <Input
              value={warehouseForm.address}
              onChange={(e) => setWarehouseForm({ ...warehouseForm, address: e.target.value })}
              placeholder="e.g. 102 Seattle Logistics park"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold">Contact Phone</label>
            <Input
              value={warehouseForm.phone}
              onChange={(e) => setWarehouseForm({ ...warehouseForm, phone: e.target.value })}
              placeholder="e.g. +1 (555) 302-9812"
            />
          </div>
          <div className="pt-4">
            <Button type="submit" className="w-full" isLoading={createWarehouseMutation.isPending}>
              Create Warehouse location
            </Button>
          </div>
        </form>
      </Drawer>

      {/* DRAWERS: Stock Transfer drafting */}
      <Drawer isOpen={isTransferDrawerOpen} onClose={() => setIsTransferDrawerOpen(false)} title="Draft Stock Transfer Shift">
        <form onSubmit={handleTransferSubmit} className="p-4 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-bold">Origin Warehouse</label>
              <Select
                options={[
                  { label: "-- Origin --", value: "" },
                  ...(warehouses || []).map((w) => ({ label: w.name, value: w.id.toString() })),
                ]}
                value={transferForm.fromWarehouseId}
                onChange={(e) => setTransferForm({ ...transferForm, fromWarehouseId: e.target.value })}
                required
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold">Destination Warehouse</label>
              <Select
                options={[
                  { label: "-- Destination --", value: "" },
                  ...(warehouses || []).map((w) => ({ label: w.name, value: w.id.toString() })),
                ]}
                value={transferForm.toWarehouseId}
                onChange={(e) => setTransferForm({ ...transferForm, toWarehouseId: e.target.value })}
                required
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="font-bold block border-b pb-1">Products to Transfer</label>
            {transferForm.items.map((item, idx) => (
              <div key={idx} className="border p-3 rounded-lg bg-accent/10 space-y-2 relative">
                {transferForm.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...transferForm.items];
                      next.splice(idx, 1);
                      setTransferForm({ ...transferForm, items: next });
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
                      const next = [...transferForm.items];
                      next[idx].productId = e.target.value;
                      setTransferForm({ ...transferForm, items: next });
                    }}
                    required
                    className="w-full"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold">Quantity to Shift</label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const next = [...transferForm.items];
                      next[idx].quantity = e.target.value;
                      setTransferForm({ ...transferForm, items: next });
                    }}
                    required
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setTransferForm({
                  ...transferForm,
                  items: [...transferForm.items, { productId: "", variantId: "", quantity: "1" }],
                })
              }
              className="w-full"
            >
              + Add Item Line
            </Button>
          </div>

          <div className="space-y-1">
            <label className="font-bold">Internal notes</label>
            <Input
              value={transferForm.notes}
              onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
              placeholder="e.g. Transport transit notes"
            />
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full" isLoading={createTransferMutation.isPending}>
              Submit Shift Request
            </Button>
          </div>
        </form>
      </Drawer>

      {/* DRAWERS: Production Assembly */}
      <Drawer isOpen={isProductionDrawerOpen} onClose={() => setIsProductionDrawerOpen(false)} title="Launch Recipe Assembly (Production)">
        <form onSubmit={handleProductionSubmit} className="p-4 space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold">Finished Product to Assemble</label>
            <Select
              options={[
                { label: "-- Select Product --", value: "" },
                ...(products?.data || []).map((p) => ({ label: p.name, value: p.id.toString() })),
              ]}
              value={productionForm.productId}
              onChange={(e) => setProductionForm({ ...productionForm, productId: e.target.value })}
              required
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-bold">Quantity (units)</label>
              <Input
                type="number"
                value={productionForm.quantity}
                onChange={(e) => setProductionForm({ ...productionForm, quantity: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold">Warehouse Storage</label>
              <Select
                options={[
                  { label: "-- Store in --", value: "" },
                  ...(warehouses || []).map((w) => ({ label: w.name, value: w.id.toString() })),
                ]}
                value={productionForm.warehouseId}
                onChange={(e) => setProductionForm({ ...productionForm, warehouseId: e.target.value })}
                required
                className="w-full"
              />
            </div>
          </div>
          <div className="pt-4">
            <Button type="submit" className="w-full" isLoading={createProductionMutation.isPending}>
              Build Finished Goods
            </Button>
          </div>
        </form>
      </Drawer>

      {/* DRAWERS: Damage Log */}
      <Drawer isOpen={isDamageDrawerOpen} onClose={() => setIsDamageDrawerOpen(false)} title="Log Damaged write-off">
        <form onSubmit={handleDamageSubmit} className="p-4 space-y-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold">Warehouse Storage Location</label>
            <Select
              options={[
                { label: "-- Select Warehouse --", value: "" },
                ...(warehouses || []).map((w) => ({ label: w.name, value: w.id.toString() })),
              ]}
              value={damageForm.warehouseId}
              onChange={(e) => setDamageForm({ ...damageForm, warehouseId: e.target.value })}
              required
              className="w-full"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold">Damaged Product</label>
            <Select
              options={[
                { label: "-- Select Product --", value: "" },
                ...(products?.data || []).map((p) => ({ label: p.name, value: p.id.toString() })),
              ]}
              value={damageForm.productId}
              onChange={(e) => setDamageForm({ ...damageForm, productId: e.target.value })}
              required
              className="w-full"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold">Damaged Count (units)</label>
            <Input
              type="number"
              value={damageForm.quantity}
              onChange={(e) => setDamageForm({ ...damageForm, quantity: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold">Reason of Damage</label>
            <Input
              value={damageForm.reason}
              onChange={(e) => setDamageForm({ ...damageForm, reason: e.target.value })}
              placeholder="e.g. Expired shelf life or transit break"
              required
            />
          </div>
          <div className="pt-4">
            <Button type="submit" className="w-full" isLoading={createDamageMutation.isPending}>
              Commit Damage Write-off
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
export default WarehouseHub;
