import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../utils/prisma";
import { cache } from "../utils/cache";

const invalidateDashboardCache = () => {
  cache.invalidatePrefix("dashboard:");
};

// 1. PROCESS CHECKOUT
export const processCheckout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      customerId,
      branchId,
      total,
      tax,
      discount,
      serviceCharge,
      couponCode,
      paymentMethod,
      payments, // Array of { method, amount } for split payments
      items,    // Array of { productId, variantId, quantity, price, cost }
    } = req.body;

    if (!branchId || !items || items.length === 0 || !total) {
      return res.status(400).json({ message: "Missing required checkout parameters" });
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const invoiceNumber = `INV-POS-${Date.now()}`;
      
      // Calculate total cost and profit
      let calculatedCost = 0;
      for (const item of items) {
        calculatedCost += (item.cost || 0) * item.quantity;
      }
      const calculatedProfit = total - calculatedCost - tax;

      // 1. Create Transaction
      const trans = await tx.transaction.create({
        data: {
          invoiceNumber,
          total: parseFloat(total),
          cost: calculatedCost,
          profit: calculatedProfit,
          tax: parseFloat(tax || "0"),
          discount: parseFloat(discount || "0"),
          serviceCharge: parseFloat(serviceCharge || "0"),
          couponCode,
          status: "COMPLETED",
          paymentMethod,
          orderType: "TAKE_AWAY", // default POS type
          cashierId: req.user!.id,
          branchId: parseInt(branchId),
          customerId: customerId ? parseInt(customerId) : null,
          items: {
            create: items.map((item: any) => ({
              productId: parseInt(item.productId),
              variantId: item.variantId ? parseInt(item.variantId) : null,
              quantity: parseInt(item.quantity),
              price: parseFloat(item.price),
              cost: parseFloat(item.cost || "0"),
            })),
          },
          payments: payments && payments.length > 0 ? {
            create: payments.map((p: any) => ({
              method: p.method,
              amount: parseFloat(p.amount),
            })),
          } : undefined,
        },
        include: {
          items: true,
          payments: true,
        },
      });

      // 2. Decrement physical inventory stock and create movement logs
      for (const item of items) {
        const qty = parseInt(item.quantity);
        
        if (item.variantId) {
          // Variant stock decrement
          await tx.productVariant.update({
            where: { id: parseInt(item.variantId) },
            data: { stock: { decrement: qty } },
          });
        } else {
          // Master product stock decrement
          await tx.product.update({
            where: { id: parseInt(item.productId) },
            data: { stock: { decrement: qty } },
          });
        }

        // Log Stock movement
        await tx.stockMovement.create({
          data: {
            productId: parseInt(item.productId),
            variantId: item.variantId ? parseInt(item.variantId) : null,
            type: "OUT",
            quantity: qty,
            userId: req.user!.id,
            reason: `Sales checkout: Invoice ${invoiceNumber}`,
          },
        });
      }

      // 3. Create Activity log
      await tx.activityLog.create({
        data: {
          userId: req.user!.id,
          action: "POS_CHECKOUT",
          details: `Processed invoice ${invoiceNumber} total ${total}`,
        },
      });

      return trans;
    });

    invalidateDashboardCache();
    return res.status(201).json(transaction);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to process checkout transaction", error: error.message });
  }
};

// 2. HOLD & RESUME ORDERS QUEUES
export const holdOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      notes,
      tax,
      discount,
      serviceCharge,
      total,
      customerId,
      branchId,
      items,
    } = req.body;

    if (!branchId || !items || items.length === 0 || !total) {
      return res.status(400).json({ message: "Missing required hold parameters" });
    }

    const invoiceNumber = `HOLD-${Date.now()}`;

    const held = await prisma.heldOrder.create({
      data: {
        invoiceNumber,
        total: parseFloat(total),
        tax: parseFloat(tax || "0"),
        discount: parseFloat(discount || "0"),
        serviceCharge: parseFloat(serviceCharge || "0"),
        notes,
        customerId: customerId ? parseInt(customerId) : null,
        branchId: parseInt(branchId),
        cashierId: req.user!.id,
        items: {
          create: items.map((item: any) => ({
            productId: parseInt(item.productId),
            variantId: item.variantId ? parseInt(item.variantId) : null,
            quantity: parseInt(item.quantity),
            price: parseFloat(item.price),
            cost: parseFloat(item.cost || "0"),
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return res.status(201).json(held);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to place order on hold", error: error.message });
  }
};

export const getHeldOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
    const where = branchId ? { branchId } : {};

    const held = await prisma.heldOrder.findMany({
      where,
      include: {
        items: {
          include: {
            product: { select: { name: true, sku: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json(held);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load held orders list", error: error.message });
  }
};

export const deleteHeldOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.heldOrder.delete({ where: { id } });
    return res.status(200).json({ message: "Held order cleared" });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to delete held order", error: error.message });
  }
};

// 3. VOID & RETURNS ACTIONS
export const voidTransaction = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { reason } = req.body;

    const transaction = await prisma.$transaction(async (tx) => {
      const current = await tx.transaction.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!current) throw new Error("Transaction not found");
      if (current.status === "VOIDED") throw new Error("Transaction already voided");

      const updated = await tx.transaction.update({
        where: { id },
        data: { status: "VOIDED" },
      });

      // Restore physical stock levels and write movement logs
      for (const item of current.items) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        } else {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            type: "IN",
            quantity: item.quantity,
            userId: req.user!.id,
            reason: `Voided transaction: Invoice ${current.invoiceNumber} (${reason || "No reason given"})`,
          },
        });
      }

      // Log Return audit
      await tx.returnLog.create({
        data: {
          transactionId: id,
          refundAmount: current.total,
          reason: reason || "Void sale",
          returnedItems: JSON.stringify(current.items),
        },
      });

      // Audit Activity
      await tx.activityLog.create({
        data: {
          userId: req.user!.id,
          action: "VOID_SALE",
          details: `Voided Invoice ${current.invoiceNumber} for refund amount ${current.total}`,
        },
      });

      return updated;
    });

    invalidateDashboardCache();
    return res.status(200).json(transaction);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to void transaction", error: error.message });
  }
};

// 4. GIFT CARDS QUERY
export const getGiftCard = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code } = req.params;
    const card = await prisma.giftCard.findUnique({ where: { code } });

    if (!card) {
      return res.status(404).json({ message: "Gift card not found" });
    }
    if (!card.isActive) {
      return res.status(400).json({ message: "Gift card is currently inactive" });
    }
    if (card.expiryDate && new Date(card.expiryDate) < new Date()) {
      return res.status(400).json({ message: "Gift card is expired" });
    }

    return res.status(200).json(card);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to find gift card", error: error.message });
  }
};
