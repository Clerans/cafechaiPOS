import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  CreditCard,
  Building,
  Package,
  AlertTriangle,
  Clock,
  Briefcase,
  User,
  ShieldCheck,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { DashboardFilter, FilterState } from "@/components/dashboard/DashboardFilter";
import { StatCard } from "@/components/dashboard/StatCard";
import { ChartWidget } from "@/components/dashboard/ChartWidget";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import api from "@/utils/api";

interface SummaryData {
  todaySales: number;
  todayOrders: number;
  todayProfit: number;
  todayExpenses: number;
  cashDrawerBalance: number;
  monthlySales: number;
  monthlyProfit: number;
  monthlyGrowth: number;
}

interface ChartData {
  dailySales: any[];
  monthlySales: any[];
  paymentMethods: any[];
  salesByBranch: any[];
  orderTypes: any[];
  inventoryValue: any[];
}

interface TableData {
  topSellingProducts: any[];
  topCategories: any[];
  topCustomers: any[];
  topEmployees: any[];
  lowStockProducts: any[];
  expiringProducts: any[];
  recentTransactions: any[];
  recentActivities: any[];
}

export function DashboardOverview() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Initialize filters (Default to last 30 days)
  const [filters, setFilters] = React.useState<FilterState>(() => {
    const now = new Date();
    const start = new Date();
    start.setDate(now.getDate() - 30);
    return {
      branchId: "",
      dateRange: "30days",
      startDate: start.toISOString(),
      endDate: now.toISOString(),
    };
  });

  // Queries
  const {
    data: summary,
    isLoading: summaryLoading,
    isRefetching: summaryRefetching,
    isError: summaryError,
  } = useQuery<SummaryData>({
    queryKey: ["dashboard", "summary", filters],
    queryFn: () =>
      api.get<SummaryData>(
        `/api/dashboard/summary?branchId=${filters.branchId}&startDate=${filters.startDate}&endDate=${filters.endDate}`
      ),
  });

  const {
    data: charts,
    isLoading: chartsLoading,
    isRefetching: chartsRefetching,
    isError: chartsError,
  } = useQuery<ChartData>({
    queryKey: ["dashboard", "charts", filters],
    queryFn: () =>
      api.get<ChartData>(
        `/api/dashboard/charts?branchId=${filters.branchId}&startDate=${filters.startDate}&endDate=${filters.endDate}`
      ),
  });

  const {
    data: tables,
    isLoading: tablesLoading,
    isRefetching: tablesRefetching,
  } = useQuery<TableData>({
    queryKey: ["dashboard", "tables", filters.branchId],
    queryFn: () => api.get<TableData>(`/api/dashboard/tables?branchId=${filters.branchId}`),
  });

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard", "charts"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard", "tables"] }),
    ]);
  };

  const isRefreshing = summaryRefetching || chartsRefetching || tablesRefetching;
  const currencySymbol = "$"; // Hardcoded for simplicity, could load from settings query

  const formatCurrency = (val: number) => {
    return `${currencySymbol}${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header welcome */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight">Enterprise Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, <span className="font-semibold text-foreground">{user?.firstName}</span>. Below is your real-time branch status.
          </p>
        </div>
      </div>

      {/* 2. Global Filters bar */}
      <DashboardFilter
        value={filters}
        onChange={setFilters}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* 3. Stats KPI Grid (8 Cards) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Sales"
          value={summary ? formatCurrency(summary.todaySales) : "$0.00"}
          icon={DollarSign}
          isLoading={summaryLoading}
          isError={summaryError}
          subtext="Processed sales today"
        />
        <StatCard
          title="Today's Orders"
          value={summary ? summary.todayOrders : 0}
          icon={ShoppingCart}
          isLoading={summaryLoading}
          isError={summaryError}
          subtext="Checkout volume today"
        />
        <StatCard
          title="Today's Profit"
          value={summary ? formatCurrency(summary.todayProfit) : "$0.00"}
          icon={TrendingUp}
          isLoading={summaryLoading}
          isError={summaryError}
          subtext="Total markup margin today"
        />
        <StatCard
          title="Today's Expenses"
          value={summary ? formatCurrency(summary.todayExpenses) : "$0.00"}
          icon={CreditCard}
          isLoading={summaryLoading}
          isError={summaryError}
          subtext="Business costs payout today"
        />
        <StatCard
          title="Drawer Cash Balance"
          value={summary ? formatCurrency(summary.cashDrawerBalance) : "$0.00"}
          icon={Building}
          isLoading={summaryLoading}
          isError={summaryError}
          subtext="Active session safe balance"
        />
        <StatCard
          title="Monthly Sales"
          value={summary ? formatCurrency(summary.monthlySales) : "$0.00"}
          icon={DollarSign}
          isLoading={summaryLoading}
          isError={summaryError}
          growth={summary?.monthlyGrowth}
          growthSubtext="vs previous month"
        />
        <StatCard
          title="Monthly Profit"
          value={summary ? formatCurrency(summary.monthlyProfit) : "$0.00"}
          icon={TrendingUp}
          isLoading={summaryLoading}
          isError={summaryError}
          subtext="Total markup margin this month"
        />
        <StatCard
          title="System Inventory Value"
          value={charts ? formatCurrency(charts.inventoryValue[1]?.value || 0) : "$0.00"}
          icon={Package}
          isLoading={chartsLoading}
          isError={chartsError}
          subtext="Warehouse stock retail estimate"
        />
      </div>

      {/* 4. Analytical Charts Grid (7 charts) */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartWidget
          title="Daily Sales Trend"
          description="Gross revenue volume and net margins plotted daily"
          type="area"
          data={charts?.dailySales || []}
          xKey="date"
          dataKeys={["sales", "profit"]}
          labels={["Sales", "Profit"]}
          colors={["hsl(var(--primary))", "#10b981"]}
          isLoading={chartsLoading}
          isError={chartsError}
          valueFormatter={(val) => formatCurrency(val)}
        />

        <ChartWidget
          title="Payment Mode Distribution"
          description="Percentage share of order payments methods"
          type="donut"
          data={charts?.paymentMethods || []}
          xKey="name"
          dataKeys={["value"]}
          labels={["Sales Value"]}
          colors={["#10b981", "#3b82f6", "#f59e0b"]}
          isLoading={chartsLoading}
          isError={chartsError}
          valueFormatter={(val) => formatCurrency(val)}
        />

        <ChartWidget
          title="Sales by Storefront Branch"
          description="Comparative sales performance across corporate branches"
          type="bar"
          data={charts?.salesByBranch || []}
          xKey="name"
          dataKeys={["value"]}
          labels={["Branch Sales"]}
          colors={["#8b5cf6"]}
          isLoading={chartsLoading}
          isError={chartsError}
          valueFormatter={(val) => formatCurrency(val)}
        />

        <ChartWidget
          title="Order Fullfilment Types"
          description="Breakdown of checkout fullfilments logs"
          type="pie"
          data={charts?.orderTypes || []}
          xKey="name"
          dataKeys={["value"]}
          labels={["Revenue"]}
          colors={["#3b82f6", "#ec4899", "#10b981"]}
          isLoading={chartsLoading}
          isError={chartsError}
          valueFormatter={(val) => formatCurrency(val)}
        />

        <ChartWidget
          title="Yearly Sales Progression"
          description="Comparative revenue tracking over the past 12 months"
          type="bar"
          data={charts?.monthlySales || []}
          xKey="month"
          dataKeys={["sales"]}
          labels={["Monthly Sales"]}
          colors={["#3b82f6"]}
          isLoading={chartsLoading}
          isError={chartsError}
          valueFormatter={(val) => formatCurrency(val)}
        />

        <ChartWidget
          title="Inventory Assets Estimate"
          description="Comparison of wholesale asset cost vs retail values and margins"
          type="bar"
          data={charts?.inventoryValue || []}
          xKey="name"
          dataKeys={["value"]}
          labels={["Value"]}
          colors={["#f59e0b"]}
          isLoading={chartsLoading}
          isError={chartsError}
          valueFormatter={(val) => formatCurrency(val)}
        />

        <ChartWidget
          title="Net Profit Velocity"
          description="Net profit progression lines"
          type="line"
          data={charts?.dailySales || []}
          xKey="date"
          dataKeys={["profit"]}
          labels={["Net Profit"]}
          colors={["#10b981"]}
          isLoading={chartsLoading}
          isError={chartsError}
          valueFormatter={(val) => formatCurrency(val)}
        />
      </div>

      {/* 5. Lists Grid: Recent Logs, Stock warnings, Top lists */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Table 1: Recent Transactions */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-bold">Recent Checkout Invoices</CardTitle>
            <CardDescription>Latest customer checkout transactions</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {tablesLoading ? (
              <div className="p-6 text-center text-xs text-muted-foreground">Loading sales...</div>
            ) : tables?.recentTransactions && tables.recentTransactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Cashier</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tables.recentTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono font-semibold text-xs text-primary">
                        {tx.invoiceNumber}
                      </TableCell>
                      <TableCell className="text-xs">{tx.cashierName}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="secondary">{tx.paymentMethod}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold">
                        {formatCurrency(tx.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">No recent invoices found.</div>
            )}
          </CardContent>
        </Card>

        {/* Table 2: Top Selling Products */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-bold">Top Performing Products</CardTitle>
            <CardDescription>Best sellers based on volume and margin</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {tablesLoading ? (
              <div className="p-6 text-center text-xs text-muted-foreground">Loading performers...</div>
            ) : tables?.topSellingProducts && tables.topSellingProducts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-center">Sold Qty</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tables.topSellingProducts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold text-xs">{p.name}</TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground">{p.sku}</TableCell>
                      <TableCell className="text-center text-xs font-semibold">{p.soldQty}</TableCell>
                      <TableCell className="text-right text-xs font-semibold text-emerald-600">
                        {formatCurrency(p.revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">No top selling products.</div>
            )}
          </CardContent>
        </Card>

        {/* Alert 1: Low Stock Warnings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription>Products at or below threshold limits</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {tablesLoading ? (
              <div className="p-6 text-center text-xs text-muted-foreground">Checking inventory...</div>
            ) : tables?.lowStockProducts && tables.lowStockProducts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Current Stock</TableHead>
                    <TableHead className="text-center">Alert Limit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tables.lowStockProducts.map((p) => (
                    <TableRow key={p.id} className="bg-amber-500/5 hover:bg-amber-500/10">
                      <TableCell className="font-semibold text-xs flex flex-col">
                        <span>{p.name}</span>
                        <span className="text-[9px] font-mono text-muted-foreground">{p.sku}</span>
                      </TableCell>
                      <TableCell className="text-center text-xs font-bold text-destructive">
                        {p.stock} units
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {p.threshold} units
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6 text-center text-xs text-emerald-600 font-medium">
                All inventory quantities are safely above thresholds.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alert 2: Expiring Products Warnings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-destructive" />
              Expiring Products warnings
            </CardTitle>
            <CardDescription>Perishable stocks expiring within 7 days</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {tablesLoading ? (
              <div className="p-6 text-center text-xs text-muted-foreground">Checking expirations...</div>
            ) : tables?.expiringProducts && tables.expiringProducts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tables.expiringProducts.map((p) => {
                    const isExpired = new Date(p.expiryDate) < new Date();
                    return (
                      <TableRow key={p.id} className={isExpired ? "bg-red-500/5 hover:bg-red-500/10" : "bg-orange-500/5 hover:bg-orange-500/10"}>
                        <TableCell className="font-semibold text-xs flex flex-col">
                          <span>{p.name}</span>
                          <span className="text-[9px] font-mono text-muted-foreground">{p.sku}</span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {new Date(p.expiryDate).toLocaleDateString()}
                          {isExpired ? (
                            <span className="text-[10px] text-destructive font-bold block">EXPIRED</span>
                          ) : (
                            <span className="text-[10px] text-amber-500 font-bold block">EXPIRING SOON</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-xs font-bold">{p.stock} units</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6 text-center text-xs text-emerald-600 font-medium">
                No inventory matches found for expiration concerns.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table 3: Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Loyal Customers
            </CardTitle>
            <CardDescription>Top buyers by total sales checkout</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {tablesLoading ? (
              <div className="p-6 text-center text-xs text-muted-foreground">Loading loyalty...</div>
            ) : tables?.topCustomers && tables.topCustomers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-center">Orders</TableHead>
                    <TableHead className="text-right">Total Spent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tables.topCustomers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-semibold text-xs flex flex-col">
                        <span>{c.name}</span>
                        <span className="text-[10px] text-muted-foreground">{c.phone}</span>
                      </TableCell>
                      <TableCell className="text-center text-xs font-semibold">{c.ordersCount}</TableCell>
                      <TableCell className="text-right text-xs font-semibold text-emerald-600">
                        {formatCurrency(c.totalSpent)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">No customer transactions logged.</div>
            )}
          </CardContent>
        </Card>

        {/* Table 4: Top Employees */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Top Staff Performers
            </CardTitle>
            <CardDescription>Cashier sales performance rankings</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {tablesLoading ? (
              <div className="p-6 text-center text-xs text-muted-foreground">Loading ranks...</div>
            ) : tables?.topEmployees && tables.topEmployees.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-center">Sales count</TableHead>
                    <TableHead className="text-right">Revenues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tables.topEmployees.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-semibold text-xs flex flex-col">
                        <span>{e.name}</span>
                        <span className="text-[10px] text-muted-foreground">{e.email}</span>
                      </TableCell>
                      <TableCell className="text-center text-xs font-semibold">{e.ordersCount}</TableCell>
                      <TableCell className="text-right text-xs font-semibold text-primary">
                        {formatCurrency(e.salesTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">No employee checkouts logged.</div>
            )}
          </CardContent>
        </Card>

        {/* Stream: Recent Activity Logs */}
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Recent Operations Stream
            </CardTitle>
            <CardDescription>Security audit trails and database records changes</CardDescription>
          </CardHeader>
          <CardContent>
            {tablesLoading ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Loading audit log...</div>
            ) : tables?.recentActivities && tables.recentActivities.length > 0 ? (
              <div className="space-y-4">
                {tables.recentActivities.map((act) => (
                  <div key={act.id} className="flex justify-between items-start border-b pb-3 last:border-0 last:pb-0 gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {act.action}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">by {act.user}</span>
                      </div>
                      <p className="text-xs font-medium text-foreground">{act.details}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(act.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">No operations logs registered.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
export default DashboardOverview;
