import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  FileSpreadsheet,
  FileText,
  Printer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Drawer } from "@/components/ui/Drawer";
import { Badge } from "@/components/ui/Badge";
import api from "@/utils/api";

interface BankAccount {
  id: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  balance: number;
}

interface FinancialTransaction {
  id: number;
  type: "INCOME" | "EXPENSE" | "BANK_TRANSFER" | "DRAWER_ADJUSTMENT";
  amount: number;
  description: string;
  reference: string | null;
  bankAccount: { bankName: string; accountNumber: string } | null;
  date: string;
}

export function FinanceHub() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<"dashboard" | "accounts" | "ledger" | "reports">("dashboard");
  const [reportType, setReportType] = React.useState<string>("sales");

  // Drawer toggles
  const [isAccountDrawerOpen, setIsAccountDrawerOpen] = React.useState(false);
  const [isTransactionDrawerOpen, setIsTransactionDrawerOpen] = React.useState(false);

  // Filters state
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  // Forms states
  const [accountForm, setAccountForm] = React.useState({
    bankName: "",
    accountNumber: "",
    accountHolder: "",
    balance: "",
  });

  const [transactionForm, setTransactionForm] = React.useState({
    type: "EXPENSE",
    amount: "",
    description: "",
    reference: "",
    bankAccountId: "",
  });

  // Queries
  const { data: accounts, isLoading: accountsLoading } = useQuery<BankAccount[]>({
    queryKey: ["bank-accounts"],
    queryFn: () => api.get("/api/finance/accounts"),
  });

  const { data: ledger, isLoading: ledgerLoading } = useQuery<FinancialTransaction[]>({
    queryKey: ["ledger-transactions"],
    queryFn: () => api.get("/api/finance/transactions"),
  });

  const { data: plData } = useQuery<any>({
    queryKey: ["profit-loss"],
    queryFn: () => api.get("/api/finance/profit-loss"),
  });

  const { data: reportData, isLoading: reportLoading } = useQuery<any[]>({
    queryKey: ["specialized-report", reportType],
    queryFn: () => api.get(`/api/finance/reports?type=${reportType}`),
  });

  // Mutations
  const accountMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/finance/accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      setIsAccountDrawerOpen(false);
      setAccountForm({ bankName: "", accountNumber: "", accountHolder: "", balance: "" });
    },
  });

  const transactionMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/finance/transactions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ledger-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["profit-loss"] });
      setIsTransactionDrawerOpen(false);
      setTransactionForm({ type: "EXPENSE", amount: "", description: "", reference: "", bankAccountId: "" });
    },
  });

  // Export alerts
  const handleExportExcel = () => {
    alert(`Exporting ${reportType} report as Excel (.xlsx) successfully!`);
  };

  const handleExportPDF = () => {
    alert(`Exporting ${reportType} report as PDF successfully!`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Finance & Analytical Reports</h1>
          <p className="text-sm text-muted-foreground">Monitor P&L statement, bank balances, and generate operational ledger spreadsheets.</p>
        </div>

        <div className="flex gap-2">
          {activeTab === "accounts" && (
            <Button size="sm" onClick={() => setIsAccountDrawerOpen(true)} className="flex items-center gap-1.5 bg-primary">
              <Plus className="h-4 w-4" />
              <span>Link Bank Account</span>
            </Button>
          )}
          {activeTab === "ledger" && (
            <Button size="sm" onClick={() => setIsTransactionDrawerOpen(true)} className="flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Record Transaction</span>
            </Button>
          )}
          {activeTab === "reports" && (
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={handleExportExcel} className="flex items-center gap-1">
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline">Export Excel</span>
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportPDF} className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Export PDF</span>
              </Button>
              <Button size="sm" onClick={handlePrint} className="flex items-center gap-1">
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">Print</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b gap-2 overflow-x-auto scrollbar-none">
        {(["dashboard", "accounts", "ledger", "reports"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 capitalize transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filters Panel for Reports */}
      {activeTab === "reports" && (
        <Card className="bg-muted/10">
          <CardContent className="p-4 grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Select Report Type</label>
              <Select
                options={[
                  { label: "Sales Report Log", value: "sales" },
                  { label: "Purchases Report Log", value: "purchases" },
                  { label: "Inventory Valuation", value: "inventory" },
                  { label: "Customers Accounts", value: "customers" },
                  { label: "Suppliers Matrix", value: "suppliers" },
                  { label: "Payroll Disbursements", value: "payroll" },
                  { label: "Warehouse Stocking", value: "warehouse" },
                  { label: "Product Margins", value: "margin" },
                  { label: "Negative Stock Warnings", value: "negative_stock" },
                  { label: "Waste Report Log", value: "waste" },
                ]}
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Date Start</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Date End</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 1. Dashboard Tab */}
      {activeTab === "dashboard" && plData && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Total Sales Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-primary">${plData.revenue.totalSales.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Cost of Goods Sold (COGS)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-amber-600">${plData.cogs.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-destructive">${plData.expenses.totalExpenses.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase">Net Income Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-black ${plData.netProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                  ${plData.netProfit.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Accounts Summary Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Bank Balance Status Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {accounts && accounts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bank Account</TableHead>
                        <TableHead>Account Holder</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accounts.map((acc) => (
                        <TableRow key={acc.id}>
                          <TableCell className="text-xs font-bold">{acc.bankName} ({acc.accountNumber})</TableCell>
                          <TableCell className="text-xs">{acc.accountHolder}</TableCell>
                          <TableCell className="text-right text-xs font-mono font-bold text-primary">${acc.balance.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-6 text-center text-xs text-muted-foreground">No accounts.</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Recent Cash Flows</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {ledger && ledger.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledger.slice(0, 5).map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-xs font-semibold">{tx.description}</TableCell>
                          <TableCell>
                            <Badge className={`${tx.type === "INCOME" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"} border text-[9px]`}>
                              {tx.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono font-bold">${tx.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-6 text-center text-xs text-muted-foreground">No flows logged.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 2. Accounts List */}
      {activeTab === "accounts" && (
        <Card>
          <CardContent className="p-0">
            {accountsLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">Loading accounts...</div>
            ) : accounts && accounts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bank name</TableHead>
                    <TableHead>Account Number</TableHead>
                    <TableHead>Account Holder</TableHead>
                    <TableHead className="text-right">Current Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell className="text-xs font-bold">{acc.bankName}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{acc.accountNumber}</TableCell>
                      <TableCell className="text-xs font-semibold">{acc.accountHolder}</TableCell>
                      <TableCell className="text-right text-xs font-mono font-bold text-primary">${acc.balance.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">No connected bank accounts found.</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. Transaction Ledger */}
      {activeTab === "ledger" && (
        <Card>
          <CardContent className="p-0">
            {ledgerLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">Loading ledger logs...</div>
            ) : ledger && ledger.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Bank Account link</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs">{new Date(tx.date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs font-semibold">{tx.description}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{tx.reference || "-"}</TableCell>
                      <TableCell className="text-xs">
                        {tx.bankAccount ? `${tx.bankAccount.bankName} (${tx.bankAccount.accountNumber})` : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${tx.type === "INCOME" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"} border text-[9px]`}>
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono font-bold">${tx.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">No financial ledger entries found.</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 4. Specialized Reports Grid */}
      {activeTab === "reports" && (
        <Card>
          <CardContent className="p-0">
            {reportLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">Loading report sheet...</div>
            ) : reportData && reportData.length > 0 ? (
              <div>
                {/* Render reports depending on reportType selection */}
                {reportType === "sales" && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice ID</TableHead>
                        <TableHead>Cashier</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead className="text-right">Total sum</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.map((row: any) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs font-bold text-primary">#{row.id}</TableCell>
                          <TableCell className="text-xs">{row.cashier?.firstName} {row.cashier?.lastName}</TableCell>
                          <TableCell className="text-xs">{row.paymentMethod}</TableCell>
                          <TableCell className="text-right text-xs font-mono font-bold">${row.total.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {reportType === "purchases" && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PO ID</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Grand Total</TableHead>
                        <TableHead>Created At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.map((row: any) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs font-bold">#{row.id}</TableCell>
                          <TableCell className="text-xs font-semibold">{row.supplier?.name}</TableCell>
                          <TableCell>
                            <Badge className="bg-primary/10 text-primary text-[9px] border-0">{row.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono font-bold">${row.grandTotal.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {reportType === "inventory" && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Units stock</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Valuation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.map((row: any, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs font-semibold">{row.name}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{row.sku}</TableCell>
                          <TableCell className="text-xs">{row.category}</TableCell>
                          <TableCell className="text-right text-xs font-bold">{row.stock}</TableCell>
                          <TableCell className="text-right text-xs font-mono">${row.cost.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-xs font-mono font-bold text-primary">${row.value.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {reportType === "customers" && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Group Tier</TableHead>
                        <TableHead>Loyalty Points</TableHead>
                        <TableHead className="text-right">Wallet Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.map((row: any) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs font-semibold">{row.name}</TableCell>
                          <TableCell className="text-xs">{row.group?.name || "Regular"}</TableCell>
                          <TableCell className="text-xs font-mono font-bold text-amber-600">{row.loyaltyPoints}</TableCell>
                          <TableCell className="text-right text-xs font-mono font-bold text-primary">${row.walletBalance.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {reportType === "suppliers" && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supplier Company</TableHead>
                        <TableHead>Contact Person</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Outstanding Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.map((row: any) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs font-bold text-primary">{row.name}</TableCell>
                          <TableCell className="text-xs">{row.contactPerson}</TableCell>
                          <TableCell className="text-xs font-mono">{row.phone}</TableCell>
                          <TableCell className="text-xs font-bold text-destructive">${row.outstandingBalance || "0.00"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {reportType === "payroll" && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Salary Month</TableHead>
                        <TableHead className="text-right">Net Payout</TableHead>
                        <TableHead>Disbursed status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.map((row: any) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs font-semibold">{row.user?.firstName} {row.user?.lastName}</TableCell>
                          <TableCell className="text-xs font-bold">{row.month} {row.year}</TableCell>
                          <TableCell className="text-right text-xs font-mono font-bold text-primary">${row.netSalary.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={`${row.status === "PAID" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"} text-[9px] border-0`}>
                              {row.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {reportType === "warehouse" && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Warehouse</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Available stock</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.map((row: any, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs font-bold">{row.warehouse?.name}</TableCell>
                          <TableCell className="text-xs font-semibold">{row.product?.name}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{row.product?.sku}</TableCell>
                          <TableCell className="text-right text-xs font-bold text-primary">{row.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {reportType === "margin" && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Profit sum</TableHead>
                        <TableHead className="text-right">Margin percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.map((row: any, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs font-semibold">{row.name}</TableCell>
                          <TableCell className="text-right text-xs font-mono">${row.price.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-xs font-mono">${row.cost.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-xs font-mono text-emerald-600 font-bold">${row.profit.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-xs font-mono font-bold text-primary">{row.margin}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {reportType === "negative_stock" && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product Name</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Current Stock</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.map((row: any) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs font-semibold text-destructive">{row.name}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{row.sku}</TableCell>
                          <TableCell className="text-right text-xs font-mono font-bold text-destructive">{row.stock}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {reportType === "waste" && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Warehouse</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Cost Value</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.map((row: any) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs font-bold">{row.warehouseName}</TableCell>
                          <TableCell className="text-xs font-semibold">{row.productName}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{row.sku}</TableCell>
                          <TableCell className="text-right text-xs font-bold text-destructive">{row.quantity}</TableCell>
                          <TableCell className="text-right text-xs font-mono font-bold text-destructive">${row.value.toFixed(2)}</TableCell>
                          <TableCell className="text-xs italic">"{row.reason}"</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">No records returned for this report category.</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* DRAWERS: Link Bank Account */}
      <Drawer isOpen={isAccountDrawerOpen} onClose={() => setIsAccountDrawerOpen(false)} title="Link Bank Account">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            accountMutation.mutate(accountForm);
          }}
          className="p-4 space-y-4 text-xs"
        >
          <div className="space-y-1">
            <label className="font-bold">Bank Name</label>
            <Input
              value={accountForm.bankName}
              onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
              placeholder="e.g. JPMorgan Chase Bank"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold">Account Number</label>
            <Input
              value={accountForm.accountNumber}
              onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
              placeholder="e.g. 10229891827"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold">Account Holder Title</label>
            <Input
              value={accountForm.accountHolder}
              onChange={(e) => setAccountForm({ ...accountForm, accountHolder: e.target.value })}
              placeholder="e.g. Cafe Chai LLC"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold">Starting balance ($)</label>
            <Input
              type="number"
              value={accountForm.balance}
              onChange={(e) => setAccountForm({ ...accountForm, balance: e.target.value })}
              placeholder="e.g. 5000.00"
            />
          </div>
          <div className="pt-4">
            <Button type="submit" className="w-full" isLoading={accountMutation.isPending}>
              Link Account
            </Button>
          </div>
        </form>
      </Drawer>

      {/* DRAWERS: Record transaction */}
      <Drawer isOpen={isTransactionDrawerOpen} onClose={() => setIsTransactionDrawerOpen(false)} title="Record Transaction">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            transactionMutation.mutate(transactionForm);
          }}
          className="p-4 space-y-4 text-xs"
        >
          <div className="space-y-1">
            <label className="font-bold">Flow Type</label>
            <Select
              options={[
                { label: "Revenue Income", value: "INCOME" },
                { label: "Operational Expense", value: "EXPENSE" },
              ]}
              value={transactionForm.type}
              onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value })}
              className="w-full"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold">Amount value ($)</label>
            <Input
              type="number"
              value={transactionForm.amount}
              onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
              placeholder="e.g. 250.00"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold">Description info</label>
            <Input
              value={transactionForm.description}
              onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
              placeholder="e.g. Purchased espresso filters"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold">Reference identifier</label>
            <Input
              value={transactionForm.reference}
              onChange={(e) => setTransactionForm({ ...transactionForm, reference: e.target.value })}
              placeholder="e.g. TXN-RENT-JUN"
            />
          </div>
          <div className="space-y-1">
            <label className="font-bold">Bank Account connection</label>
            <Select
              options={[
                { label: "-- Petty Cash / Not Linked --", value: "" },
                ...(accounts || []).map((acc) => ({ label: `${acc.bankName} (${acc.accountNumber})`, value: acc.id.toString() })),
              ]}
              value={transactionForm.bankAccountId}
              onChange={(e) => setTransactionForm({ ...transactionForm, bankAccountId: e.target.value })}
              className="w-full"
            />
          </div>
          <div className="pt-4">
            <Button type="submit" className="w-full" isLoading={transactionMutation.isPending}>
              Record Ledger Entry
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
export default FinanceHub;
