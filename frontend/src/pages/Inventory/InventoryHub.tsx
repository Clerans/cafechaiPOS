import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  FileSpreadsheet,
  Download,
  Barcode,
  History,
  Trash2,
  Edit2,
  AlertTriangle,
  Tags,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Drawer } from "@/components/ui/Drawer";
import { Dialog } from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import { BarcodeQRModal } from "@/components/inventory/BarcodeQRModal";
import { TimelineWidget } from "@/components/inventory/TimelineWidget";
import api from "@/utils/api";

// Types
interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  threshold: number;
  expiryDate: string | null;
  categoryId: number;
  category: { name: string };
  brandId: number | null;
  brand: { name: string } | null;
  unitId: number | null;
  unit: { name: string; shortName: string } | null;
  variants: any[];
}

interface Brand {
  id: number;
  name: string;
}

interface Unit {
  id: number;
  name: string;
  shortName: string;
}


export function InventoryHub() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<"products" | "stock" | "batches" | "recipes" | "config">("products");

  // Filter States
  const [search, setSearch] = React.useState("");
  const [catFilter, setCatFilter] = React.useState("");
  const [brandFilter, setBrandFilter] = React.useState("");
  const [stockAlert, setStockAlert] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(8);

  // Modal / Drawer control states
  const [isProductDrawerOpen, setIsProductDrawerOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [productToDelete, setProductToDelete] = React.useState<Product | null>(null);
  
  const [isLabelOpen, setIsLabelOpen] = React.useState(false);
  const [labelProduct, setLabelProduct] = React.useState<{ sku: string; name: string; price: number } | null>(null);

  const [isTimelineOpen, setIsTimelineOpen] = React.useState(false);
  const [timelineProductId, setTimelineProductId] = React.useState<number | null>(null);

  const [isAdjustDrawerOpen, setIsAdjustDrawerOpen] = React.useState(false);
  const [isBatchDrawerOpen, setIsBatchDrawerOpen] = React.useState(false);
  const [isRecipeDrawerOpen, setIsRecipeDrawerOpen] = React.useState(false);
  const [isRawDrawerOpen, setIsRawDrawerOpen] = React.useState(false);

  // Forms states
  const [productForm, setProductForm] = React.useState({
    name: "",
    sku: "",
    price: "",
    cost: "",
    stock: "",
    threshold: "10",
    expiryDate: "",
    categoryId: "",
    brandId: "",
    unitId: "",
  });

  const [adjustForm, setAdjustForm] = React.useState({
    productId: "",
    variantId: "",
    type: "INCREASE",
    quantity: "",
    cost: "",
    reason: "",
  });

  const [batchForm, setBatchForm] = React.useState({
    productId: "",
    variantId: "",
    batchNumber: "",
    quantity: "",
    cost: "",
    price: "",
    expiryDate: "",
  });

  const [rawForm, setRawForm] = React.useState({
    name: "",
    sku: "",
    unit: "kg",
    stock: "0",
    cost: "",
  });

  const [recipeForm, setRecipeForm] = React.useState({
    productId: "",
    variantId: "",
    name: "",
    description: "",
    ingredients: [{ rawMaterialId: "", quantityUsed: "" }],
  });

  // Queries
  const { data: productsData, isLoading: productsLoading } = useQuery<{ data: Product[]; pagination: any }>({
    queryKey: ["products", search, catFilter, brandFilter, stockAlert, page],
    queryFn: () =>
      api.get(
        `/api/inventory/products?search=${search}&categoryId=${catFilter}&brandId=${brandFilter}&stockAlert=${stockAlert}&page=${page}&limit=${limit}`
      ),
  });


  const { data: brands } = useQuery<Brand[]>({
    queryKey: ["brands"],
    queryFn: () => api.get("/api/inventory/brands"),
  });

  const { data: units } = useQuery<Unit[]>({
    queryKey: ["units"],
    queryFn: () => api.get("/api/inventory/units"),
  });

  const { data: batches } = useQuery<any[]>({
    queryKey: ["batches"],
    queryFn: () => api.get("/api/inventory/batches"),
  });

  const { data: rawMaterials } = useQuery<any[]>({
    queryKey: ["raw-materials"],
    queryFn: () => api.get("/api/inventory/raw-materials"),
  });

  const { data: recipes } = useQuery<any[]>({
    queryKey: ["recipes"],
    queryFn: () => api.get("/api/inventory/recipes"),
  });

  const { data: movements } = useQuery<any[]>({
    queryKey: ["movements"],
    queryFn: () => api.get("/api/inventory/movements"),
  });

  // Mutators
  const createProductMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/inventory/products", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsProductDrawerOpen(false);
      resetProductForm();
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.put(`/api/inventory/products/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsProductDrawerOpen(false);
      setSelectedProduct(null);
      resetProductForm();
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/inventory/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsDeleteOpen(false);
      setProductToDelete(null);
    },
  });

  const adjustStockMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/inventory/adjustments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      setIsAdjustDrawerOpen(false);
      setAdjustForm({ productId: "", variantId: "", type: "INCREASE", quantity: "", cost: "", reason: "" });
    },
  });

  const createBatchMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/inventory/batches", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["movements"] });
      setIsBatchDrawerOpen(false);
      setBatchForm({ productId: "", variantId: "", batchNumber: "", quantity: "", cost: "", price: "", expiryDate: "" });
    },
  });

  const createRawMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/inventory/raw-materials", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["raw-materials"] });
      setIsRawDrawerOpen(false);
      setRawForm({ name: "", sku: "", unit: "kg", stock: "0", cost: "" });
    },
  });

  const createRecipeMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/inventory/recipes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      setIsRecipeDrawerOpen(false);
      setRecipeForm({ productId: "", variantId: "", name: "", description: "", ingredients: [{ rawMaterialId: "", quantityUsed: "" }] });
    },
  });

  const resetProductForm = () => {
    setProductForm({
      name: "",
      sku: "",
      price: "",
      cost: "",
      stock: "",
      threshold: "10",
      expiryDate: "",
      categoryId: "",
      brandId: "",
      unitId: "",
    });
  };

  const handleEditClick = (p: Product) => {
    setSelectedProduct(p);
    setProductForm({
      name: p.name,
      sku: p.sku,
      price: p.price.toString(),
      cost: p.cost.toString(),
      stock: p.stock.toString(),
      threshold: p.threshold.toString(),
      expiryDate: p.expiryDate ? p.expiryDate.split("T")[0] : "",
      categoryId: p.categoryId.toString(),
      brandId: p.brandId?.toString() || "",
      unitId: p.unitId?.toString() || "",
    });
    setIsProductDrawerOpen(true);
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...productForm,
      price: parseFloat(productForm.price),
      cost: parseFloat(productForm.cost),
      stock: parseInt(productForm.stock),
      threshold: parseInt(productForm.threshold),
      categoryId: parseInt(productForm.categoryId),
      brandId: productForm.brandId ? parseInt(productForm.brandId) : null,
      unitId: productForm.unitId ? parseInt(productForm.unitId) : null,
    };

    if (selectedProduct) {
      updateProductMutation.mutate({ id: selectedProduct.id, data: payload });
    } else {
      createProductMutation.mutate(payload);
    }
  };

  // Mock excel triggers
  const handleExportCSV = () => {
    if (!productsData?.data) return;
    const headers = ["ID", "SKU", "Name", "Category", "Stock", "Price", "Cost"];
    const rows = productsData.data.map((p) => [
      p.id,
      p.sku,
      p.name,
      p.category?.name || "N/A",
      p.stock,
      p.price,
      p.cost,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = () => {
    // Simulated Excel / CSV Bulk uploader
    const mockSku = `MOCK-SKU-${Math.floor(Math.random() * 900) + 100}`;
    const payload = {
      name: `Imported Bulk ${mockSku}`,
      sku: mockSku,
      price: 12.99,
      cost: 5.50,
      stock: 100,
      threshold: 15,
      categoryId: 1, // Assumes first category
    };
    createProductMutation.mutate(payload);
    alert(`Mock CSV row parsed: Created Product with SKU ${mockSku}`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Stock & Inventory Hub</h1>
          <p className="text-sm text-muted-foreground">Manage products, variants, batches, recipes, and warehouse adjustments.</p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto shrink-0">
          <Button variant="outline" size="sm" onClick={handleImportCSV} className="flex items-center gap-1.5 flex-1 sm:flex-initial">
            <FileSpreadsheet className="h-4 w-4" />
            <span>Import CSV</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="flex items-center gap-1.5 flex-1 sm:flex-initial">
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* 2. Tabs Switcher */}
      <div className="flex border-b overflow-x-auto gap-2 scrollbar-none">
        {(["products", "stock", "batches", "recipes", "config"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 capitalize transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "config" ? "Brands & Units" : tab}
          </button>
        ))}
      </div>

      {/* 3. Products List View Tab */}
      {activeTab === "products" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center bg-card p-4 rounded-xl border">
            <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search SKU or name..."
                  className="pl-9 h-9"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <Select
                  options={[
                    { label: "All Categories", value: "" },
                    { label: "Beverages", value: "1" },
                    { label: "Espresso", value: "2" },
                    { label: "Bakery", value: "3" },
                    { label: "Sandwiches", value: "4" },
                  ]}
                  value={catFilter}
                  onChange={(e) => {
                    setCatFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 w-36"
                />
                <Select
                  options={[
                    { label: "All Brands", value: "" },
                    ...(brands || []).map((b) => ({ label: b.name, value: b.id.toString() })),
                  ]}
                  value={brandFilter}
                  onChange={(e) => {
                    setBrandFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 w-32"
                />
                <button
                  onClick={() => setStockAlert(!stockAlert)}
                  className={`h-9 px-3 border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    stockAlert
                      ? "bg-destructive/10 border-destructive text-destructive"
                      : "bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Alerts Only</span>
                </button>
              </div>
            </div>

            <Button size="sm" onClick={() => { setSelectedProduct(null); resetProductForm(); setIsProductDrawerOpen(true); }} className="flex items-center gap-1.5 w-full md:w-auto">
              <Plus className="h-4 w-4" />
              <span>Add Product</span>
            </Button>
          </div>

          {/* Responsive Table Card */}
          <Card>
            <CardContent className="p-0">
              {productsLoading ? (
                <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">Loading product inventory...</div>
              ) : productsData?.data && productsData.data.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Brand / Unit</TableHead>
                        <TableHead className="text-center">Stock Level</TableHead>
                        <TableHead className="text-right">Cost Price</TableHead>
                        <TableHead className="text-right">Retail Price</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productsData.data.map((p) => {
                        const isLow = p.stock <= p.threshold;
                        return (
                          <TableRow key={p.id} className={isLow ? "bg-red-500/5" : ""}>
                            <TableCell className="font-semibold text-xs flex flex-col">
                              <span>{p.name}</span>
                              <span className="text-[10px] text-muted-foreground font-medium">{p.category?.name || "N/A"}</span>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                            <TableCell className="text-xs">
                              {p.brand?.name || "Generic"} / {p.unit?.shortName || "pcs"}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`text-xs font-bold ${isLow ? "text-destructive" : "text-foreground"}`}>
                                {p.stock} units
                              </span>
                              {isLow && (
                                <span className="text-[9px] text-destructive block font-medium">Reorder Alert</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">${p.cost.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono text-xs">${p.price.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1.5">
                                <Button variant="outline" size="icon" onClick={() => { setLabelProduct(p); setIsLabelOpen(true); }} title="Generate barcode label">
                                  <Barcode className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => { setTimelineProductId(p.id); setIsTimelineOpen(true); }} title="View stock movements">
                                  <History className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => handleEditClick(p)} title="Edit product">
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => { setProductToDelete(p); setIsDeleteOpen(true); }} className="text-destructive hover:bg-destructive/10" title="Delete product">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Pagination control footer */}
                  <div className="p-4 border-t flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Page {page} of {productsData.pagination.pages || 1}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage((p) => Math.max(p - 1, 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === productsData.pagination.pages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-xs text-muted-foreground">No inventory records found.</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4. Stock Adjustments & Movements Tab */}
      {activeTab === "stock" && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Controls menu panel */}
          <div className="col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Stock Control Actions</CardTitle>
                <CardDescription>Adjust and audit stock levels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full flex items-center gap-1.5 justify-start h-9" onClick={() => setIsAdjustDrawerOpen(true)}>
                  <Tags className="h-4 w-4" />
                  <span>Manual stock Adjustment</span>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Valuation Summary</CardTitle>
                <CardDescription>Estimated inventory asset values</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 font-medium text-xs">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Total Stock quantity</span>
                  <span>{productsData?.data.reduce((acc, p) => acc + p.stock, 0) || 0} units</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Asset cost valuation</span>
                  <span>${productsData?.data.reduce((acc, p) => acc + (p.stock * p.cost), 0).toFixed(2) || "0.00"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Retail selling value</span>
                  <span>${productsData?.data.reduce((acc, p) => acc + (p.stock * p.price), 0).toFixed(2) || "0.00"}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Audit trails movement lists */}
          <div className="col-span-1 md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">Stock movements stream</CardTitle>
                <CardDescription>Historical logs of stock adjustments and entries</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[500px] overflow-y-auto">
                <TimelineWidget events={movements || []} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 5. Batches & Expirations Tab */}
      {activeTab === "batches" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-card p-4 rounded-xl border">
            <div>
              <h3 className="text-sm font-bold">Product Batch Management</h3>
              <p className="text-xs text-muted-foreground">Track stock batches and expiration alerts</p>
            </div>
            <Button size="sm" onClick={() => setIsBatchDrawerOpen(true)} className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Record Batch</span>
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {batches && batches.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch SKU / No.</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead className="text-center">Stock Level</TableHead>
                      <TableHead className="text-right">Unit cost</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Alert status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((b) => {
                      const isExpired = b.expiryDate && new Date(b.expiryDate) < new Date();
                      return (
                        <TableRow key={b.id} className={isExpired ? "bg-red-500/5" : ""}>
                          <TableCell className="font-semibold text-xs">
                            <span className="block font-mono text-primary">{b.batchNumber}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{b.product?.sku}</span>
                          </TableCell>
                          <TableCell className="text-xs font-semibold">{b.product?.name}</TableCell>
                          <TableCell className="text-center text-xs font-bold">{b.quantity} units</TableCell>
                          <TableCell className="text-right font-mono text-xs">${b.cost.toFixed(2)}</TableCell>
                          <TableCell className="text-xs">
                            {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : "N/A"}
                          </TableCell>
                          <TableCell>
                            {isExpired ? (
                              <Badge className="bg-destructive text-white border-0 text-[9px]">Expired</Badge>
                            ) : (
                              <Badge className="bg-emerald-500 text-white border-0 text-[9px]">Safe</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-12 text-center text-xs text-muted-foreground">No recorded batches.</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 6. Recipes & Ingredients Tab */}
      {activeTab === "recipes" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Ingredients stocks list */}
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-card p-4 rounded-xl border">
              <div>
                <h3 className="text-sm font-bold">Raw Material Stocks</h3>
                <p className="text-xs text-muted-foreground">Manage ingredient inventory levels</p>
              </div>
              <Button size="sm" onClick={() => setIsRawDrawerOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Stock
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {rawMaterials && rawMaterials.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material Name</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-center">Stock Count</TableHead>
                        <TableHead className="text-right">Avg Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rawMaterials.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-semibold text-xs">{r.name}</TableCell>
                          <TableCell className="font-mono text-[10px] text-muted-foreground">{r.sku}</TableCell>
                          <TableCell className="text-center text-xs font-bold">
                            {r.stock} {r.unit}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">${r.cost.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-12 text-center text-xs text-muted-foreground">No raw materials registered.</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recipes specifications list */}
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-card p-4 rounded-xl border">
              <div>
                <h3 className="text-sm font-bold">Product Recipes & Blends</h3>
                <p className="text-xs text-muted-foreground">Connect checkout items to raw ingredients</p>
              </div>
              <Button size="sm" onClick={() => setIsRecipeDrawerOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Recipe
              </Button>
            </div>

            <Card>
              <CardContent className="p-6 space-y-4">
                {recipes && recipes.length > 0 ? (
                  recipes.map((rec) => (
                    <div key={rec.id} className="border p-4 rounded-xl space-y-2 bg-card">
                      <div className="flex justify-between items-start border-b pb-2">
                        <div>
                          <h4 className="text-xs font-extrabold">{rec.name}</h4>
                          <span className="text-[10px] text-muted-foreground font-mono">{rec.product?.name}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {rec.ingredients?.map((ing: any) => (
                          <div key={ing.id} className="flex justify-between text-[11px] text-muted-foreground">
                            <span>{ing.rawMaterial?.name}</span>
                            <span className="font-mono font-bold text-foreground">
                              {ing.quantityUsed} {ing.rawMaterial?.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-xs text-muted-foreground">No recipe formulas stored.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 7. Configurations: Brands & Units */}
      {activeTab === "config" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Brands Config Table */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Product Brands</CardTitle>
                <CardDescription>Add and list product manufacturer labels</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {brands && brands.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Brand Name</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {brands.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="text-xs font-semibold">{b.name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground">No brands registered.</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Units Config Table */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Units of Measures</CardTitle>
                <CardDescription>Standard metrics systems links</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {units && units.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Unit Name</TableHead>
                        <TableHead>Abbreviation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {units.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="text-xs font-semibold">{u.name}</TableCell>
                          <TableCell className="font-mono text-xs font-bold text-primary">{u.shortName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground">No units registered.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* DRAWERS AND DIALOGS */}

      {/* A. Product add/edit Drawer */}
      <Drawer
        isOpen={isProductDrawerOpen}
        onClose={() => setIsProductDrawerOpen(false)}
        title={selectedProduct ? "Edit Product Details" : "Create New Product"}
        description="Insert core SKU identifier, pricing, and category parameters."
      >
        <form onSubmit={handleProductSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold">Product Name</label>
            <Input
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold">SKU Code</label>
              <Input
                value={productForm.sku}
                onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold">Category</label>
              <Select
                options={[
                  { label: "Beverages", value: "1" },
                  { label: "Espresso", value: "2" },
                  { label: "Bakery", value: "3" },
                  { label: "Sandwiches", value: "4" },
                ]}
                value={productForm.categoryId}
                onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold">Cost Price ($)</label>
              <Input
                type="number"
                step="0.01"
                value={productForm.cost}
                onChange={(e) => setProductForm({ ...productForm, cost: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold">Selling Price ($)</label>
              <Input
                type="number"
                step="0.01"
                value={productForm.price}
                onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold">Opening Stock</label>
              <Input
                type="number"
                value={productForm.stock}
                onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                required
                disabled={!!selectedProduct} // Prevent manual stock modifications here on edits
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold">Low Alert Threshold</label>
              <Input
                type="number"
                value={productForm.threshold}
                onChange={(e) => setProductForm({ ...productForm, threshold: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold">Expiry Date</label>
              <Input
                type="date"
                value={productForm.expiryDate}
                onChange={(e) => setProductForm({ ...productForm, expiryDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold">Brand Link</label>
              <Select
                options={[
                  { label: "None", value: "" },
                  ...(brands || []).map((b) => ({ label: b.name, value: b.id.toString() })),
                ]}
                value={productForm.brandId}
                onChange={(e) => setProductForm({ ...productForm, brandId: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold">Unit Link</label>
              <Select
                options={[
                  { label: "None", value: "" },
                  ...(units || []).map((u) => ({ label: u.name, value: u.id.toString() })),
                ]}
                value={productForm.unitId}
                onChange={(e) => setProductForm({ ...productForm, unitId: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsProductDrawerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createProductMutation.isPending || updateProductMutation.isPending}>
              {selectedProduct ? "Save Changes" : "Create Product"}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* B. Manual Stock Adjustment Drawer */}
      <Drawer
        isOpen={isAdjustDrawerOpen}
        onClose={() => setIsAdjustDrawerOpen(false)}
        title="Stock Level Manual Adjustment"
        description="Increment or decrement physical warehouse count indexes."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            adjustStockMutation.mutate({
              reason: adjustForm.reason,
              type: adjustForm.type,
              items: [
                {
                  productId: parseInt(adjustForm.productId),
                  variantId: adjustForm.variantId ? parseInt(adjustForm.variantId) : null,
                  quantity: parseInt(adjustForm.quantity),
                  cost: parseFloat(adjustForm.cost || "0.0"),
                },
              ],
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-1">
            <label className="text-xs font-bold">Select Product</label>
            <Select
              options={[
                { label: "Select product...", value: "" },
                ...(productsData?.data || []).map((p) => ({ label: p.name, value: p.id.toString() })),
              ]}
              value={adjustForm.productId}
              onChange={(e) => setAdjustForm({ ...adjustForm, productId: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold">Adjustment Type</label>
              <Select
                options={[
                  { label: "INCREASE (Restock/Receipt)", value: "INCREASE" },
                  { label: "DECREASE (Damages/Loss)", value: "DECREASE" },
                ]}
                value={adjustForm.type}
                onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold">Adjustment Quantity</label>
              <Input
                type="number"
                value={adjustForm.quantity}
                onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold">Cost Estimate per unit ($)</label>
            <Input
              type="number"
              step="0.01"
              value={adjustForm.cost}
              onChange={(e) => setAdjustForm({ ...adjustForm, cost: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold">Adjustment Reason</label>
            <Input
              value={adjustForm.reason}
              onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
              placeholder="e.g. Broken packaging writeoff"
              required
            />
          </div>

          <div className="pt-4 border-t flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsAdjustDrawerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={adjustStockMutation.isPending}>
              Apply Stock Correction
            </Button>
          </div>
        </form>
      </Drawer>

      {/* C. Batch record Drawer */}
      <Drawer
        isOpen={isBatchDrawerOpen}
        onClose={() => setIsBatchDrawerOpen(false)}
        title="Record Batch Consignment"
        description="Log perishable batches containing specific expiration parameters."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createBatchMutation.mutate({
              ...batchForm,
              productId: parseInt(batchForm.productId),
              quantity: parseInt(batchForm.quantity),
              cost: parseFloat(batchForm.cost),
              price: parseFloat(batchForm.price),
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-1">
            <label className="text-xs font-bold">Product Link</label>
            <Select
              options={[
                { label: "Select product...", value: "" },
                ...(productsData?.data || []).map((p) => ({ label: p.name, value: p.id.toString() })),
              ]}
              value={batchForm.productId}
              onChange={(e) => setBatchForm({ ...batchForm, productId: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold">Batch Number/Ref</label>
              <Input
                value={batchForm.batchNumber}
                onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })}
                placeholder="e.g. BAT-2026-06"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold">Consignment Quantity</label>
              <Input
                type="number"
                value={batchForm.quantity}
                onChange={(e) => setBatchForm({ ...batchForm, quantity: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold">Unit Cost ($)</label>
              <Input
                type="number"
                step="0.01"
                value={batchForm.cost}
                onChange={(e) => setBatchForm({ ...batchForm, cost: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold">Retail Price ($)</label>
              <Input
                type="number"
                step="0.01"
                value={batchForm.price}
                onChange={(e) => setBatchForm({ ...batchForm, price: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold">Expiry Date</label>
              <Input
                type="date"
                value={batchForm.expiryDate}
                onChange={(e) => setBatchForm({ ...batchForm, expiryDate: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsBatchDrawerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createBatchMutation.isPending}>
              Commit Batch Consignment
            </Button>
          </div>
        </form>
      </Drawer>

      {/* D. Ingredients Raw Materials Drawer */}
      <Drawer
        isOpen={isRawDrawerOpen}
        onClose={() => setIsRawDrawerOpen(false)}
        title="Register Raw Material"
        description="Store bulk ingredients raw indexes parameters."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createRawMutation.mutate(rawForm);
          }}
          className="space-y-4"
        >
          <div className="space-y-1">
            <label className="text-xs font-bold">Material Name</label>
            <Input
              value={rawForm.name}
              onChange={(e) => setRawForm({ ...rawForm, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold">SKU Code</label>
              <Input
                value={rawForm.sku}
                onChange={(e) => setRawForm({ ...rawForm, sku: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold">Unit of Measure</label>
              <Select
                options={[
                  { label: "kg (Kilogram)", value: "kg" },
                  { label: "g (Gram)", value: "g" },
                  { label: "L (Liter)", value: "L" },
                  { label: "ml (Milliliter)", value: "ml" },
                  { label: "pcs (Pieces)", value: "pcs" },
                ]}
                value={rawForm.unit}
                onChange={(e) => setRawForm({ ...rawForm, unit: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold">Opening Quantity</label>
              <Input
                type="number"
                value={rawForm.stock}
                onChange={(e) => setRawForm({ ...rawForm, stock: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold">Standard Cost ($)</label>
              <Input
                type="number"
                step="0.01"
                value={rawForm.cost}
                onChange={(e) => setRawForm({ ...rawForm, cost: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsRawDrawerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createRawMutation.isPending}>
              Register Ingredient
            </Button>
          </div>
        </form>
      </Drawer>

      {/* E. Recipe Add Drawer */}
      <Drawer
        isOpen={isRecipeDrawerOpen}
        onClose={() => setIsRecipeDrawerOpen(false)}
        title="Store Recipe Blend Formula"
        description="Bind ingredients checklist to product SKU output levels."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createRecipeMutation.mutate({
              ...recipeForm,
              ingredients: recipeForm.ingredients.map((ing) => ({
                rawMaterialId: parseInt(ing.rawMaterialId),
                quantityUsed: parseFloat(ing.quantityUsed),
              })),
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-1">
            <label className="text-xs font-bold">Formula Product Link</label>
            <Select
              options={[
                { label: "Select product...", value: "" },
                ...(productsData?.data || []).map((p) => ({ label: p.name, value: p.id.toString() })),
              ]}
              value={recipeForm.productId}
              onChange={(e) => setRecipeForm({ ...recipeForm, productId: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold">Recipe Blend Name</label>
            <Input
              value={recipeForm.name}
              onChange={(e) => setRecipeForm({ ...recipeForm, name: e.target.value })}
              placeholder="e.g. Standard Blend Recipe"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold">Ingredient checklist</label>
            {recipeForm.ingredients.map((ing, idx) => (
              <div key={idx} className="flex gap-2 mb-2 items-center">
                <Select
                  options={[
                    { label: "Select material...", value: "" },
                    ...(rawMaterials || []).map((rm) => ({ label: `${rm.name} (${rm.unit})`, value: rm.id.toString() })),
                  ]}
                  value={ing.rawMaterialId}
                  onChange={(e) => {
                    const next = [...recipeForm.ingredients];
                    next[idx].rawMaterialId = e.target.value;
                    setRecipeForm({ ...recipeForm, ingredients: next });
                  }}
                  required
                  className="flex-1"
                />
                <Input
                  type="number"
                  step="0.001"
                  placeholder="Qty"
                  value={ing.quantityUsed}
                  onChange={(e) => {
                    const next = [...recipeForm.ingredients];
                    next[idx].quantityUsed = e.target.value;
                    setRecipeForm({ ...recipeForm, ingredients: next });
                  }}
                  required
                  className="w-24"
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setRecipeForm({
                  ...recipeForm,
                  ingredients: [...recipeForm.ingredients, { rawMaterialId: "", quantityUsed: "" }],
                })
              }
              className="mt-2 text-xs"
            >
              Add Row Item
            </Button>
          </div>

          <div className="pt-4 border-t flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsRecipeDrawerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createRecipeMutation.isPending}>
              Commit Recipe Formula
            </Button>
          </div>
        </form>
      </Drawer>

      {/* F. Timeline audit stream Drawer */}
      <Drawer
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        title="Stock movement Timeline Log"
        description="Visual audit logs of inventory checkouts, counts, and manual adjustments."
      >
        <div className="p-2 space-y-4">
          <TimelineWidget
            events={(movements || []).filter((m) => m.productId === timelineProductId)}
          />
        </div>
      </Drawer>

      {/* G. Barcode printer Modal */}
      {labelProduct && (
        <BarcodeQRModal
          isOpen={isLabelOpen}
          onClose={() => {
            setIsLabelOpen(false);
            setLabelProduct(null);
          }}
          sku={labelProduct.sku}
          name={labelProduct.name}
          price={labelProduct.price}
        />
      )}

      {/* H. Delete Product Confirmation Dialog */}
      <Dialog isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirm Delete Product">
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Are you sure you want to permanently delete the product **{productToDelete?.name}**? This will remove all related SKU variants and recipe mappings. This action is irreversible.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              isLoading={deleteProductMutation.isPending}
              onClick={() => {
                if (productToDelete) {
                  deleteProductMutation.mutate(productToDelete.id);
                }
              }}
            >
              Permanently Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
export default InventoryHub;
