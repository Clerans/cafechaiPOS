import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../utils/prisma";
import { cache } from "../utils/cache";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper: Parse filters
const getFilters = (req: AuthenticatedRequest) => {
  const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  return { branchId, startDate, endDate };
};

export const getSummary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branchId, startDate, endDate } = getFilters(req);

    // Cache key definition
    const cacheKey = `dashboard:summary:${branchId || "all"}:${startDate?.getTime() || "na"}:${endDate?.getTime() || "na"}`;
    const cachedData = cache.get<any>(cacheKey);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    // Date definitions
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const firstDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Filters logic
    const whereBranch = branchId ? { branchId } : {};

    // 1. Today's metrics
    const todayTx = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: todayStart, lte: todayEnd },
        ...whereBranch,
      },
    });

    const todaySales = todayTx.reduce((acc, t) => acc + t.total, 0);
    const todayOrders = todayTx.length;
    const todayProfit = todayTx.reduce((acc, t) => acc + t.profit, 0);

    const todayExpensesRaw = await prisma.expense.aggregate({
      where: {
        date: { gte: todayStart, lte: todayEnd },
        ...whereBranch,
      },
      _sum: { amount: true },
    });
    const todayExpenses = todayExpensesRaw._sum.amount || 0;

    // 2. Cash Drawer Balance
    const activeSession = await prisma.cashDrawerSession.findFirst({
      where: {
        status: "OPEN",
        ...whereBranch,
      },
      orderBy: { createdAt: "desc" },
    });

    let cashDrawerBalance = 0;
    if (activeSession) {
      // Balance = opening + cash sales during session
      const cashSales = await prisma.transaction.aggregate({
        where: {
          createdAt: { gte: activeSession.createdAt },
          paymentMethod: "CASH",
          ...whereBranch,
        },
        _sum: { total: true },
      });
      cashDrawerBalance = activeSession.openingBalance + (cashSales._sum.total || 0);
    }

    // 3. Monthly metrics
    const monthlyTx = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
        ...whereBranch,
      },
    });

    const monthlySales = monthlyTx.reduce((acc, t) => acc + t.total, 0);
    const monthlyProfit = monthlyTx.reduce((acc, t) => acc + t.profit, 0);

    // 4. Monthly growth (vs previous month)
    const prevMonthlyTx = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: firstDayOfPrevMonth, lte: lastDayOfPrevMonth },
        ...whereBranch,
      },
    });
    const prevMonthlySales = prevMonthlyTx.reduce((acc, t) => acc + t.total, 0);
    let monthlyGrowth = 0;
    if (prevMonthlySales > 0) {
      monthlyGrowth = parseFloat((((monthlySales - prevMonthlySales) / prevMonthlySales) * 100).toFixed(2));
    } else if (monthlySales > 0) {
      monthlyGrowth = 100.0;
    }

    const payload = {
      todaySales,
      todayOrders,
      todayProfit,
      todayExpenses,
      cashDrawerBalance,
      monthlySales,
      monthlyProfit,
      monthlyGrowth,
    };

    cache.set(cacheKey, payload, CACHE_TTL);
    return res.status(200).json(payload);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load summary stats", error: error.message });
  }
};

export const getCharts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branchId, startDate, endDate } = getFilters(req);

    const cacheKey = `dashboard:charts:${branchId || "all"}:${startDate?.getTime() || "na"}:${endDate?.getTime() || "na"}`;
    const cachedData = cache.get<any>(cacheKey);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    // Default: past 30 days if no date filter
    const now = new Date();
    const defaultStart = new Date();
    defaultStart.setDate(now.getDate() - 30);

    const queryStart = startDate || defaultStart;
    const queryEnd = endDate || now;

    const whereBranch = branchId ? { branchId } : {};

    // 1. Daily Sales & Revenue Trend
    const rangeTx = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: queryStart, lte: queryEnd },
        ...whereBranch,
      },
      orderBy: { createdAt: "asc" },
    });

    // Group sales by day
    const dailySalesMap = new Map<string, { date: string; sales: number; profit: number; count: number }>();
    let d = new Date(queryStart);
    while (d <= queryEnd) {
      const dateStr = d.toISOString().split("T")[0];
      dailySalesMap.set(dateStr, { date: dateStr, sales: 0, profit: 0, count: 0 });
      d.setDate(d.getDate() + 1);
    }

    rangeTx.forEach((tx) => {
      const dateStr = tx.createdAt.toISOString().split("T")[0];
      const entry = dailySalesMap.get(dateStr);
      if (entry) {
        entry.sales += tx.total;
        entry.profit += tx.profit;
        entry.count += 1;
      }
    });

    const dailySales = Array.from(dailySalesMap.values());

    // 2. Monthly Sales (Past 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(now.getMonth() - 11);
    twelveMonthsAgo.setDate(1);

    const yearlyTx = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: twelveMonthsAgo },
        ...whereBranch,
      },
    });

    const monthlySalesMap = new Map<string, { month: string; sales: number; profit: number }>();
    for (let i = 11; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setMonth(now.getMonth() - i);
      const label = targetDate.toLocaleString("default", { month: "short", year: "2-digit" });
      const key = `${targetDate.getFullYear()}-${(targetDate.getMonth() + 1).toString().padStart(2, "0")}`;
      monthlySalesMap.set(key, { month: label, sales: 0, profit: 0 });
    }

    yearlyTx.forEach((tx) => {
      const key = `${tx.createdAt.getFullYear()}-${(tx.createdAt.getMonth() + 1).toString().padStart(2, "0")}`;
      const entry = monthlySalesMap.get(key);
      if (entry) {
        entry.sales += tx.total;
        entry.profit += tx.profit;
      }
    });

    const monthlySales = Array.from(monthlySalesMap.values());

    // 3. Payment Methods
    const paymentBreakdown = await prisma.transaction.groupBy({
      by: ["paymentMethod"],
      where: {
        createdAt: { gte: queryStart, lte: queryEnd },
        ...whereBranch,
      },
      _sum: { total: true },
      _count: { id: true },
    });

    const paymentMethods = paymentBreakdown.map((pm) => ({
      name: pm.paymentMethod,
      value: pm._sum.total || 0,
      count: pm._count.id,
    }));

    // 4. Sales by Branch
    const branchBreakdown = await prisma.transaction.groupBy({
      by: ["branchId"],
      where: {
        createdAt: { gte: queryStart, lte: queryEnd },
      },
      _sum: { total: true },
    });

    const branchList = await prisma.branch.findMany({
      select: { id: true, name: true, code: true },
    });

    const salesByBranch = branchBreakdown.map((bb) => {
      const br = branchList.find((b) => b.id === bb.branchId);
      return {
        name: br ? br.name : `Branch #${bb.branchId}`,
        code: br ? br.code : "N/A",
        value: bb._sum.total || 0,
      };
    });

    // 5. Order Types
    const orderTypeBreakdown = await prisma.transaction.groupBy({
      by: ["orderType"],
      where: {
        createdAt: { gte: queryStart, lte: queryEnd },
        ...whereBranch,
      },
      _sum: { total: true },
      _count: { id: true },
    });

    const orderTypes = orderTypeBreakdown.map((ot) => ({
      name: ot.orderType,
      value: ot._sum.total || 0,
      count: ot._count.id,
    }));

    // 6. Inventory Value
    const inventory = await prisma.product.findMany({
      where: branchId ? { branchId } : {},
      select: { stock: true, price: true, cost: true },
    });

    const totalAssetCost = inventory.reduce((sum, item) => sum + item.stock * item.cost, 0);
    const totalRetailValue = inventory.reduce((sum, item) => sum + item.stock * item.price, 0);
    const potentialMargin = totalRetailValue - totalAssetCost;

    const inventoryValue = [
      { name: "Asset Cost Value", value: totalAssetCost },
      { name: "Retail Selling Value", value: totalRetailValue },
      { name: "Potential Markup Margin", value: potentialMargin },
    ];

    const payload = {
      dailySales,
      monthlySales,
      paymentMethods,
      salesByBranch,
      orderTypes,
      inventoryValue,
    };

    cache.set(cacheKey, payload, CACHE_TTL);
    return res.status(200).json(payload);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load chart metrics", error: error.message });
  }
};

export const getTables = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branchId } = getFilters(req);

    const cacheKey = `dashboard:tables:${branchId || "all"}`;
    const cachedData = cache.get<any>(cacheKey);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const whereBranch = branchId ? { branchId } : {};

    // 1. Top Selling Products
    const itemsGroup = await prisma.transactionItem.groupBy({
      by: ["productId"],
      where: {
        transaction: whereBranch,
      },
      _sum: { quantity: true, price: true },
    });

    const productIds = itemsGroup.map((ig) => ig.productId);
    const productsDetails = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { category: true },
    });

    const topSellingProducts = itemsGroup
      .map((ig) => {
        const prod = productsDetails.find((p) => p.id === ig.productId);
        const qty = ig._sum.quantity || 0;
        const price = prod ? prod.price : 0;
        return {
          id: ig.productId,
          name: prod ? prod.name : "Unknown Product",
          sku: prod ? prod.sku : "N/A",
          category: prod ? prod.category.name : "N/A",
          soldQty: qty,
          revenue: qty * price,
        };
      })
      .sort((a, b) => b.soldQty - a.soldQty)
      .slice(0, 5);

    // 2. Top Categories
    const categoryTotalsMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    itemsGroup.forEach((ig) => {
      const prod = productsDetails.find((p) => p.id === ig.productId);
      if (prod) {
        const catName = prod.category.name;
        const qty = ig._sum.quantity || 0;
        const rev = qty * prod.price;

        const current = categoryTotalsMap.get(catName) || { name: catName, quantity: 0, revenue: 0 };
        current.quantity += qty;
        current.revenue += rev;
        categoryTotalsMap.set(catName, current);
      }
    });
    const topCategories = Array.from(categoryTotalsMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // 3. Top Customers
    const customerTransactions = await prisma.transaction.groupBy({
      by: ["customerId"],
      where: {
        customerId: { not: null },
        ...whereBranch,
      },
      _sum: { total: true },
      _count: { id: true },
    });

    const customerIds = customerTransactions.map((ct) => ct.customerId as number);
    const customersDetails = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
    });

    const topCustomers = customerTransactions
      .map((ct) => {
        const cust = customersDetails.find((c) => c.id === ct.customerId);
        return {
          id: ct.customerId,
          name: cust ? cust.name : "Walking Customer",
          phone: cust ? cust.phone : "N/A",
          ordersCount: ct._count.id,
          totalSpent: ct._sum.total || 0,
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // 4. Top Employees
    const employeeTransactions = await prisma.transaction.groupBy({
      by: ["cashierId"],
      where: whereBranch,
      _sum: { total: true },
      _count: { id: true },
    });

    const employeeIds = employeeTransactions.map((et) => et.cashierId);
    const employeesDetails = await prisma.user.findMany({
      where: { id: { in: employeeIds } },
    });

    const topEmployees = employeeTransactions
      .map((et) => {
        const emp = employeesDetails.find((e) => e.id === et.cashierId);
        return {
          id: et.cashierId,
          name: emp ? `${emp.firstName} ${emp.lastName}` : `Cashier #${et.cashierId}`,
          email: emp ? emp.email : "N/A",
          ordersCount: et._count.id,
          salesTotal: et._sum.total || 0,
        };
      })
      .sort((a, b) => b.salesTotal - a.salesTotal)
      .slice(0, 5);

    // 5. Low Stock Products (stock <= threshold)
    const lowStockProducts = await prisma.product.findMany({
      where: {
        stock: { lte: prisma.product.fields.threshold },
        ...whereBranch,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        threshold: true,
      },
      orderBy: { stock: "asc" },
      take: 5,
    });

    // 6. Expiring Products (expiryDate <= 7 days from now)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiringProducts = await prisma.product.findMany({
      where: {
        expiryDate: { lte: sevenDaysFromNow },
        ...whereBranch,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        expiryDate: true,
        stock: true,
      },
      orderBy: { expiryDate: "asc" },
      take: 5,
    });

    // 7. Recent Transactions (Orders)
    const recentTransactions = await prisma.transaction.findMany({
      where: whereBranch,
      include: {
        branch: { select: { name: true, code: true } },
        cashier: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const formattedRecentTx = recentTransactions.map((tx) => ({
      id: tx.id,
      invoiceNumber: tx.invoiceNumber,
      total: tx.total,
      paymentMethod: tx.paymentMethod,
      branchName: tx.branch.name,
      cashierName: `${tx.cashier.firstName} ${tx.cashier.lastName}`,
      createdAt: tx.createdAt,
    }));

    // 8. Recent Activities
    const recentActivities = await prisma.activityLog.findMany({
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const formattedActivities = recentActivities.map((act) => ({
      id: act.id,
      action: act.action,
      details: act.details,
      user: `${act.user.firstName} ${act.user.lastName}`,
      createdAt: act.createdAt,
    }));

    const payload = {
      topSellingProducts,
      topCategories,
      topCustomers,
      topEmployees,
      lowStockProducts,
      expiringProducts,
      recentTransactions: formattedRecentTx,
      recentActivities: formattedActivities,
    };

    cache.set(cacheKey, payload, CACHE_TTL);
    return res.status(200).json(payload);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load dashboard listings", error: error.message });
  }
};
