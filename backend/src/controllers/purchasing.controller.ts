import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../utils/prisma";

// 1. SUPPLIER CRUD
export const getSuppliers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: "asc" },
    });
    return res.status(200).json(suppliers);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load suppliers list", error: error.message });
  }
};

export const createSupplier = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, code, contactName, email, phone, address } = req.body;
    if (!name || !code) {
      return res.status(400).json({ message: "Supplier name and code are required" });
    }

    const supplier = await prisma.supplier.create({
      data: { name, code, contactName, email, phone, address },
    });
    return res.status(201).json(supplier);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to create supplier record", error: error.message });
  }
};

export const updateSupplier = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, code, contactName, email, phone, address } = req.body;

    const supplier = await prisma.supplier.update({
      where: { id },
      data: { name, code, contactName, email, phone, address },
    });
    return res.status(200).json(supplier);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update supplier record", error: error.message });
  }
};

export const deleteSupplier = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.supplier.delete({ where: { id } });
    return res.status(200).json({ message: "Supplier record deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to delete supplier record", error: error.message });
  }
};

// 2. PURCHASE ORDERS WORKFLOW
export const getPurchaseOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pos = await prisma.purchaseOrder.findMany({
      include: {
        supplier: { select: { name: true, code: true } },
        creator: { select: { firstName: true, lastName: true } },
        approver: { select: { firstName: true, lastName: true } },
        items: {
          include: {
            product: { select: { name: true, sku: true } },
            variant: { select: { name: true, sku: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json(pos);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load purchase orders", error: error.message });
  }
};

export const createPurchaseOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { supplierId, branchId, totalAmount, notes, items, attachments } = req.body;

    if (!supplierId || !branchId || !items || items.length === 0) {
      return res.status(400).json({ message: "Missing PO required parameters" });
    }

    const poNumber = `PO-${Date.now()}`;
    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: parseInt(supplierId),
        branchId: parseInt(branchId),
        totalAmount: parseFloat(totalAmount),
        notes,
        createdBy: req.user!.id,
        attachments: attachments ? JSON.stringify(attachments) : null,
        items: {
          create: items.map((item: any) => ({
            productId: parseInt(item.productId),
            variantId: item.variantId ? parseInt(item.variantId) : null,
            quantity: parseInt(item.quantity),
            costPrice: parseFloat(item.costPrice),
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return res.status(201).json(po);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to request purchase order", error: error.message });
  }
};

export const approvePurchaseOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body; // APPROVED or REJECTED

    if (status !== "APPROVED" && status !== "REJECTED") {
      return res.status(400).json({ message: "Invalid approval status value" });
    }

    const po = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status,
        approvedBy: req.user!.id,
      },
    });

    return res.status(200).json(po);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update PO approval status", error: error.message });
  }
};

// 3. GOODS RECEIVED NOTE (GRN) & STOCK UPDATER
export const processGRN = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { purchaseOrderId, items } = req.body; // items is array of { productId, variantId, quantity }
    if (!purchaseOrderId || !items || items.length === 0) {
      return res.status(400).json({ message: "Missing GRN required parameters" });
    }

    const grnNumber = `GRN-${Date.now()}`;

    const grn = await prisma.$transaction(async (tx) => {
      // 1. Log GRN
      const grnRecord = await tx.goodsReceivedNote.create({
        data: {
          grnNumber,
          purchaseOrderId: parseInt(purchaseOrderId),
          receivedById: req.user!.id,
          items: {
            create: items.map((i: any) => ({
              productId: parseInt(i.productId),
              variantId: i.variantId ? parseInt(i.variantId) : null,
              quantity: parseInt(i.quantity),
            })),
          },
        },
      });

      // 2. Increment Stock levels and log StockMovements
      for (const item of items) {
        const qty = parseInt(item.quantity);

        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: parseInt(item.variantId) },
            data: { stock: { increment: qty } },
          });
        } else {
          await tx.product.update({
            where: { id: parseInt(item.productId) },
            data: { stock: { increment: qty } },
          });
        }

        await tx.stockMovement.create({
          data: {
            productId: parseInt(item.productId),
            variantId: item.variantId ? parseInt(item.variantId) : null,
            type: "IN",
            quantity: qty,
            userId: req.user!.id,
            reason: `Goods Received: GRN ${grnNumber}`,
          },
        });
      }

      // 3. Update PO status to RECEIVED
      await tx.purchaseOrder.update({
        where: { id: parseInt(purchaseOrderId) },
        data: { status: "RECEIVED" },
      });

      return grnRecord;
    });

    return res.status(201).json(grn);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to process Goods Received Note", error: error.message });
  }
};

// 4. PURCHASE RETURNS
export const processPurchaseReturn = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { purchaseOrderId, totalRefund, reason, items } = req.body;
    if (!purchaseOrderId || !items || items.length === 0) {
      return res.status(400).json({ message: "Missing return parameters" });
    }

    const returnNumber = `RET-${Date.now()}`;

    const ret = await prisma.$transaction(async (tx) => {
      const returnRecord = await tx.purchaseReturn.create({
        data: {
          returnNumber,
          purchaseOrderId: parseInt(purchaseOrderId),
          totalRefund: parseFloat(totalRefund),
          reason,
          items: {
            create: items.map((i: any) => ({
              productId: parseInt(i.productId),
              variantId: i.variantId ? parseInt(i.variantId) : null,
              quantity: parseInt(i.quantity),
            })),
          },
        },
      });

      // Decrement stock levels for returned components
      for (const item of items) {
        const qty = parseInt(item.quantity);

        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: parseInt(item.variantId) },
            data: { stock: { decrement: qty } },
          });
        } else {
          await tx.product.update({
            where: { id: parseInt(item.productId) },
            data: { stock: { decrement: qty } },
          });
        }

        await tx.stockMovement.create({
          data: {
            productId: parseInt(item.productId),
            variantId: item.variantId ? parseInt(item.variantId) : null,
            type: "OUT",
            quantity: qty,
            userId: req.user!.id,
            reason: `Supplier Return: Ref ${returnNumber}`,
          },
        });
      }

      return returnRecord;
    });

    return res.status(201).json(ret);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to process supplier return", error: error.message });
  }
};

// 5. SUPPLIER STATEMENT PAYMENTS
export const getSupplierStatements = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const supplierId = parseInt(req.params.id);

    const orders = await prisma.purchaseOrder.findMany({
      where: { supplierId },
      orderBy: { createdAt: "desc" },
    });

    const payments = await prisma.supplierPayment.findMany({
      where: { supplierId },
      orderBy: { createdAt: "desc" },
    });

    const totalPurchased = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = totalPurchased - totalPaid;

    return res.status(200).json({
      summary: {
        totalPurchased,
        totalPaid,
        balance,
      },
      orders,
      payments,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load supplier statements", error: error.message });
  }
};

export const recordSupplierPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { supplierId, amount, paymentMethod, referenceNo } = req.body;
    if (!supplierId || !amount || !paymentMethod) {
      return res.status(400).json({ message: "Missing payment parameters" });
    }

    const paymentNumber = `PAY-${Date.now()}`;
    const payment = await prisma.supplierPayment.create({
      data: {
        paymentNumber,
        supplierId: parseInt(supplierId),
        amount: parseFloat(amount),
        paymentMethod,
        referenceNo,
      },
    });

    return res.status(201).json(payment);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to record payment", error: error.message });
  }
};
