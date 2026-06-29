import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../utils/prisma";

// 1. CUSTOMER CRUD
export const getCustomers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.search ? (req.query.search as string) : "";
    const groupId = req.query.groupId ? parseInt(req.query.groupId as string) : undefined;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (groupId) {
      where.groupId = groupId;
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        group: { select: { name: true, discountPercent: true } },
      },
      orderBy: { name: "asc" },
    });
    return res.status(200).json(customers);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load customers list", error: error.message });
  }
};

export const createCustomer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, phone, email, groupId, membershipLevel, creditLimit, birthday, notes } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Customer name is required" });
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        email,
        groupId: groupId ? parseInt(groupId) : null,
        membershipLevel: membershipLevel || "BRONZE",
        creditLimit: creditLimit ? parseFloat(creditLimit) : 0,
        birthday: birthday ? new Date(birthday) : null,
        notes,
      },
    });
    return res.status(201).json(customer);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to create customer account", error: error.message });
  }
};

export const updateCustomer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, phone, email, groupId, membershipLevel, creditLimit, birthday, notes } = req.body;

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name,
        phone,
        email,
        groupId: groupId ? parseInt(groupId) : null,
        membershipLevel,
        creditLimit: creditLimit ? parseFloat(creditLimit) : 0,
        birthday: birthday ? new Date(birthday) : null,
        notes,
      },
    });
    return res.status(200).json(customer);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update customer account", error: error.message });
  }
};

export const deleteCustomer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.customer.delete({ where: { id } });
    return res.status(200).json({ message: "Customer account deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to delete customer account", error: error.message });
  }
};

// 2. CUSTOMER GROUPS
export const getCustomerGroups = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const groups = await prisma.customerGroup.findMany({
      orderBy: { name: "asc" },
    });
    return res.status(200).json(groups);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load customer groups", error: error.message });
  }
};

export const createCustomerGroup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, discountPercent } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Group name is required" });
    }

    const group = await prisma.customerGroup.create({
      data: {
        name,
        discountPercent: discountPercent ? parseFloat(discountPercent) : 0,
      },
    });
    return res.status(201).json(group);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to create customer group", error: error.message });
  }
};

// 3. WALLET ADJUSTMENTS
export const adjustWallet = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { customerId, type, amount, reference } = req.body; // DEPOSIT, WITHDRAWAL
    if (!customerId || !type || !amount) {
      return res.status(400).json({ message: "Missing wallet parameter inputs" });
    }

    const parsedAmount = parseFloat(amount);
    const customer = await prisma.$transaction(async (tx) => {
      const current = await tx.customer.findUnique({ where: { id: parseInt(customerId) } });
      if (!current) throw new Error("Customer not found");

      let nextBalance = current.walletBalance;
      if (type === "DEPOSIT") {
        nextBalance += parsedAmount;
      } else if (type === "WITHDRAWAL") {
        nextBalance -= parsedAmount;
      }

      const updated = await tx.customer.update({
        where: { id: parseInt(customerId) },
        data: { walletBalance: nextBalance },
      });

      await tx.walletTransaction.create({
        data: {
          customerId: parseInt(customerId),
          type,
          amount: parsedAmount,
          reference: reference || "Manual adjustments topup",
        },
      });

      return updated;
    });

    return res.status(200).json(customer);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to adjust wallet balance", error: error.message });
  }
};

// 4. LOYALTY POINTS REDEMPTION
export const redeemPoints = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { customerId, pointsToRedeem } = req.body;
    if (!customerId || !pointsToRedeem) {
      return res.status(400).json({ message: "Missing redemption details" });
    }

    const pts = parseInt(pointsToRedeem);
    if (pts % 100 !== 0 || pts <= 0) {
      return res.status(400).json({ message: "Points must be redeemed in blocks of 100" });
    }

    const rewardCredit = pts / 100; // $1.00 credit per 100 points

    const customer = await prisma.$transaction(async (tx) => {
      const current = await tx.customer.findUnique({ where: { id: parseInt(customerId) } });
      if (!current) throw new Error("Customer not found");

      if (current.loyaltyPoints < pts) {
        throw new Error(`Insufficient loyalty points. Balance is ${current.loyaltyPoints}`);
      }

      const updated = await tx.customer.update({
        where: { id: parseInt(customerId) },
        data: {
          loyaltyPoints: current.loyaltyPoints - pts,
          walletBalance: current.walletBalance + rewardCredit,
        },
      });

      await tx.walletTransaction.create({
        data: {
          customerId: parseInt(customerId),
          type: "DEPOSIT",
          amount: rewardCredit,
          reference: `Redeemed ${pts} loyalty points`,
        },
      });

      return updated;
    });

    return res.status(200).json(customer);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to redeem loyalty points", error: error.message });
  }
};

// 5. CAMPAIGNS & PROMOTIONS dispatches
export const getCampaigns = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        _count: { select: { logs: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json(campaigns);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load marketing campaigns", error: error.message });
  }
};

export const createCampaign = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, type, message, discountPercent, couponCode } = req.body;
    if (!title || !type || !message) {
      return res.status(400).json({ message: "Title, type, and message are required" });
    }

    const campaign = await prisma.$transaction(async (tx) => {
      const camp = await tx.campaign.create({
        data: {
          title,
          type,
          message,
          discountPercent: discountPercent ? parseFloat(discountPercent) : null,
          couponCode,
        },
      });

      // Simulate delivery: load all customers and create CampaignLogs
      const list = await tx.customer.findMany({ select: { id: true } });
      if (list.length > 0) {
        await tx.campaignLog.createMany({
          data: list.map((c) => ({
            campaignId: camp.id,
            customerId: c.id,
            status: "SENT",
          })),
        });
      }

      return camp;
    });

    return res.status(201).json(campaign);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to dispatch marketing campaign", error: error.message });
  }
};

// 6. CUSTOMER STATEMENT VIEWS
export const getCustomerStatement = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        group: true,
      },
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const transactions = await prisma.transaction.findMany({
      where: { customerId: id },
      include: {
        items: {
          include: {
            product: { select: { name: true, sku: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const walletTransactions = await prisma.walletTransaction.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      customer,
      transactions,
      walletTransactions,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to compile customer statement profile", error: error.message });
  }
};
