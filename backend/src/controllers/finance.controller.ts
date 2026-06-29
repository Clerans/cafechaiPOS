import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../utils/prisma";

// 1. BANK ACCOUNTS CRUD
export const getBankAccounts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await prisma.bankAccount.findMany({
      orderBy: { bankName: "asc" },
    });
    return res.status(200).json(list);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load bank accounts", error: error.message });
  }
};

export const createBankAccount = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { bankName, accountNumber, accountHolder, balance } = req.body;
    if (!bankName || !accountNumber || !accountHolder) {
      return res.status(400).json({ message: "Missing required account fields" });
    }

    const item = await prisma.bankAccount.create({
      data: {
        bankName,
        accountNumber,
        accountHolder,
        balance: balance ? parseFloat(balance) : 0.0,
      },
    });
    return res.status(201).json(item);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to create bank account", error: error.message });
  }
};

// 2. FINANCIAL TRANSACTIONS LEDGER
export const getFinancialTransactions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await prisma.financialTransaction.findMany({
      include: {
        bankAccount: { select: { bankName: true, accountNumber: true } },
      },
      orderBy: { date: "desc" },
    });
    return res.status(200).json(list);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load ledger transactions", error: error.message });
  }
};

export const recordTransaction = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, amount, description, reference, bankAccountId } = req.body;
    if (!type || !amount || !description) {
      return res.status(400).json({ message: "Missing transaction parameters" });
    }

    const val = parseFloat(amount);

    const transaction = await prisma.$transaction(async (tx) => {
      // 1. Adjust bank balance if bankAccountId is selected
      if (bankAccountId) {
        const accId = parseInt(bankAccountId);
        const bank = await tx.bankAccount.findUnique({ where: { id: accId } });
        if (!bank) throw new Error("Bank account not found");

        let nextBalance = bank.balance;
        if (type === "INCOME") {
          nextBalance += val;
        } else if (type === "EXPENSE") {
          if (bank.balance < val) throw new Error("Insufficient bank account balance");
          nextBalance -= val;
        }

        await tx.bankAccount.update({
          where: { id: accId },
          data: { balance: nextBalance },
        });
      }

      // 2. Create Transaction log
      return await tx.financialTransaction.create({
        data: {
          type,
          amount: val,
          description,
          reference,
          bankAccountId: bankAccountId ? parseInt(bankAccountId) : null,
        },
      });
    });

    return res.status(201).json(transaction);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// 3. PROFIT & LOSS CALCULATOR ENGINE
export const getProfitLossStatement = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 1. Total Sales revenue (COMPLETED Transactions)
    const salesAgg = await prisma.transaction.aggregate({
      _sum: { total: true, cost: true, tax: true },
      where: { status: "COMPLETED" },
    });

    const totalSales = salesAgg._sum.total || 0;
    const cogs = salesAgg._sum.cost || 0;
    const salesTax = salesAgg._sum.tax || 0;

    // 2. Total Other Income
    const otherIncomeAgg = await prisma.financialTransaction.aggregate({
      _sum: { amount: true },
      where: { type: "INCOME" },
    });
    const otherIncome = otherIncomeAgg._sum.amount || 0;

    // 3. Total Expenses (Manual Expenses list + Expense transactions logs)
    const manualExpenses = await prisma.expense.aggregate({
      _sum: { amount: true },
    });
    const expTransactions = await prisma.financialTransaction.aggregate({
      _sum: { amount: true },
      where: { type: "EXPENSE" },
    });
    const totalExpenses = (manualExpenses._sum.amount || 0) + (expTransactions._sum.amount || 0);

    const grossProfit = totalSales - cogs;
    const netProfit = grossProfit + otherIncome - totalExpenses;

    return res.status(200).json({
      revenue: {
        totalSales,
        otherIncome,
        totalRevenue: totalSales + otherIncome,
      },
      cogs,
      expenses: {
        totalExpenses,
        salesTax,
      },
      grossProfit,
      netProfit,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to compile profit & loss report", error: error.message });
  }
};

// 4. MULTI-DIMENSIONAL CONSOLIDATED REPORTS
export const getSpecializedReports = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reportType = req.query.type as string;

    if (reportType === "sales") {
      const data = await prisma.transaction.findMany({
        include: { cashier: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json(data);
    }

    if (reportType === "purchases") {
      const data = await prisma.purchaseOrder.findMany({
        include: { supplier: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json(data);
    }

    if (reportType === "inventory") {
      const list = await prisma.product.findMany({
        include: { category: { select: { name: true } } },
        orderBy: { name: "asc" },
      });
      const data = list.map((p) => ({
        name: p.name,
        sku: p.sku,
        stock: p.stock,
        cost: p.cost,
        value: p.stock * p.cost,
        category: p.category.name,
      }));
      return res.status(200).json(data);
    }

    if (reportType === "customers") {
      const data = await prisma.customer.findMany({
        include: { group: { select: { name: true } } },
        orderBy: { name: "asc" },
      });
      return res.status(200).json(data);
    }

    if (reportType === "suppliers") {
      const data = await prisma.supplier.findMany({
        orderBy: { name: "asc" },
      });
      return res.status(200).json(data);
    }

    if (reportType === "payroll") {
      const data = await prisma.payroll.findMany({
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json(data);
    }

    if (reportType === "warehouse") {
      const data = await prisma.warehouseStock.findMany({
        include: {
          warehouse: { select: { name: true } },
          product: { select: { name: true, sku: true } },
        },
        orderBy: { warehouse: { name: "asc" } },
      });
      return res.status(200).json(data);
    }

    if (reportType === "margin") {
      const list = await prisma.product.findMany({
        orderBy: { name: "asc" },
      });
      const data = list.map((p) => {
        const profit = p.price - p.cost;
        const margin = p.price > 0 ? (profit / p.price) * 100 : 0.0;
        return {
          name: p.name,
          sku: p.sku,
          price: p.price,
          cost: p.cost,
          profit,
          margin: margin.toFixed(2),
        };
      });
      return res.status(200).json(data);
    }

    if (reportType === "negative_stock") {
      const data = await prisma.product.findMany({
        where: { stock: { lte: 0 } },
        orderBy: { name: "asc" },
      });
      return res.status(200).json(data);
    }

    if (reportType === "waste") {
      const list = await prisma.damagedGoods.findMany({
        include: {
          warehouse: { select: { name: true } },
          product: { select: { name: true, sku: true, cost: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      const data = list.map((dg) => ({
        id: dg.id,
        warehouseName: dg.warehouse.name,
        productName: dg.product.name,
        sku: dg.product.sku,
        quantity: dg.quantity,
        reason: dg.reason,
        cost: dg.product.cost,
        value: dg.quantity * dg.product.cost,
        createdAt: dg.createdAt,
      }));
      return res.status(200).json(data);
    }

    return res.status(400).json({ message: "Invalid report type requested" });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to compile report data", error: error.message });
  }
};
