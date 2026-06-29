import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../utils/prisma";

// 1. WAREHOUSES CRUD
export const getWarehouses = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { name: "asc" },
    });
    return res.status(200).json(warehouses);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load warehouses", error: error.message });
  }
};

export const createWarehouse = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, code, address, phone } = req.body;
    if (!name || !code) {
      return res.status(400).json({ message: "Warehouse name and code are required" });
    }

    const warehouse = await prisma.warehouse.create({
      data: { name, code, address, phone },
    });
    return res.status(201).json(warehouse);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to create warehouse record", error: error.message });
  }
};

// 2. STOCK LEVELS LIST
export const getWarehouseStocks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stocks = await prisma.warehouseStock.findMany({
      include: {
        warehouse: { select: { name: true, code: true } },
        product: { select: { name: true, sku: true, price: true, cost: true } },
        variant: { select: { name: true, sku: true, price: true, cost: true } },
      },
      orderBy: { product: { name: "asc" } },
    });
    return res.status(200).json(stocks);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load stock levels", error: error.message });
  }
};

// 3. STOCK TRANSFERS
export const getTransfers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const transfers = await prisma.stockTransfer.findMany({
      include: {
        fromWarehouse: { select: { name: true } },
        toWarehouse: { select: { name: true } },
        items: {
          include: {
            product: { select: { name: true, sku: true } },
            variant: { select: { name: true, sku: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json(transfers);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load stock transfers", error: error.message });
  }
};

export const createTransfer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fromWarehouseId, toWarehouseId, notes, items } = req.body;
    if (!fromWarehouseId || !toWarehouseId || !items || items.length === 0) {
      return res.status(400).json({ message: "Missing transfer parameters" });
    }

    const transferNumber = `TRF-${Date.now()}`;
    const transfer = await prisma.stockTransfer.create({
      data: {
        transferNumber,
        fromWarehouseId: parseInt(fromWarehouseId),
        toWarehouseId: parseInt(toWarehouseId),
        status: "PENDING",
        notes,
        createdBy: req.user!.id,
        items: {
          create: items.map((i: any) => ({
            productId: parseInt(i.productId),
            variantId: i.variantId ? parseInt(i.variantId) : null,
            quantity: parseInt(i.quantity),
          })),
        },
      },
    });

    return res.status(201).json(transfer);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to create transfer order", error: error.message });
  }
};

export const approveTransfer = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body; // APPROVED or CANCELLED

    if (status !== "APPROVED" && status !== "CANCELLED") {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!transfer) throw new Error("Transfer order not found");
      if (transfer.status !== "PENDING") throw new Error("Transfer is already completed or cancelled");

      if (status === "APPROVED") {
        // Adjust inventory balances: deduct from origin, add to destination
        for (const item of transfer.items) {
          // 1. Origin deduction
          const originStock = await tx.warehouseStock.findFirst({
            where: {
              warehouseId: transfer.fromWarehouseId,
              productId: item.productId,
              variantId: item.variantId,
            },
          });

          if (!originStock || originStock.quantity < item.quantity) {
            throw new Error(`Insufficient stock in origin warehouse for product ID ${item.productId}`);
          }

          await tx.warehouseStock.update({
            where: { id: originStock.id },
            data: { quantity: { decrement: item.quantity } },
          });

          // 2. Destination addition
          const destStock = await tx.warehouseStock.findFirst({
            where: {
              warehouseId: transfer.toWarehouseId,
              productId: item.productId,
              variantId: item.variantId,
            },
          });

          if (destStock) {
            await tx.warehouseStock.update({
              where: { id: destStock.id },
              data: { quantity: { increment: item.quantity } },
            });
          } else {
            await tx.warehouseStock.create({
              data: {
                warehouseId: transfer.toWarehouseId,
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity,
              },
            });
          }
        }
      }

      const finalStatus = status === "APPROVED" ? "COMPLETED" : "CANCELLED";
      return await tx.stockTransfer.update({
        where: { id },
        data: {
          status: finalStatus,
          approvedBy: req.user!.id,
        },
      });
    });

    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// 4. PRODUCTION MANUFACTURING ORDERS
export const getProductionOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = await prisma.productionOrder.findMany({
      include: {
        product: { select: { name: true, sku: true } },
        warehouse: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json(orders);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load production orders", error: error.message });
  }
};

export const createProductionOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId, variantId, quantity, warehouseId } = req.body;
    if (!productId || !quantity || !warehouseId) {
      return res.status(400).json({ message: "Missing production parameters" });
    }

    const orderNumber = `PRD-${Date.now()}`;
    const qty = parseInt(quantity);

    const order = await prisma.$transaction(async (tx) => {
      // 1. Resolve product recipe to verify ingredients
      const recipe = await tx.recipe.findFirst({
        where: {
          productId: parseInt(productId),
          variantId: variantId ? parseInt(variantId) : null,
        },
        include: {
          ingredients: { include: { rawMaterial: true } },
        },
      });

      if (!recipe) {
        throw new Error("No recipe configuration found for this product. Define ingredients first.");
      }

      // 2. Deduct ingredient inventory raw materials
      for (const ingredient of recipe.ingredients) {
        const rawMat = ingredient.rawMaterial;
        const totalNeeded = ingredient.quantityUsed * qty;

        if (rawMat.stock < totalNeeded) {
          throw new Error(`Insufficient stock for ingredient: ${rawMat.name}. Need ${totalNeeded}${rawMat.unit}, available ${rawMat.stock}${rawMat.unit}`);
        }

        await tx.rawMaterial.update({
          where: { id: rawMat.id },
          data: { stock: { decrement: totalNeeded } },
        });
      }

      // 3. Increment finished product in WarehouseStock
      const stock = await tx.warehouseStock.findFirst({
        where: {
          warehouseId: parseInt(warehouseId),
          productId: parseInt(productId),
          variantId: variantId ? parseInt(variantId) : null,
        },
      });

      if (stock) {
        await tx.warehouseStock.update({
          where: { id: stock.id },
          data: { quantity: { increment: qty } },
        });
      } else {
        await tx.warehouseStock.create({
          data: {
            warehouseId: parseInt(warehouseId),
            productId: parseInt(productId),
            variantId: variantId ? parseInt(variantId) : null,
            quantity: qty,
          },
        });
      }

      // 4. Create completed ProductionOrder log
      return await tx.productionOrder.create({
        data: {
          orderNumber,
          productId: parseInt(productId),
          quantity: qty,
          status: "COMPLETED",
          warehouseId: parseInt(warehouseId),
          createdBy: req.user!.id,
        },
      });
    });

    return res.status(201).json(order);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// 5. DAMAGED GOODS
export const getDamagedGoods = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await prisma.damagedGoods.findMany({
      include: {
        warehouse: { select: { name: true } },
        product: { select: { name: true, sku: true } },
        variant: { select: { name: true, sku: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json(list);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load damaged goods log", error: error.message });
  }
};

export const createDamagedGoods = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { warehouseId, productId, variantId, quantity, reason } = req.body;
    if (!warehouseId || !productId || !quantity) {
      return res.status(400).json({ message: "Missing damage log parameters" });
    }

    const qty = parseInt(quantity);
    const log = await prisma.$transaction(async (tx) => {
      // 1. Verify and deduct stock level
      const stock = await tx.warehouseStock.findFirst({
        where: {
          warehouseId: parseInt(warehouseId),
          productId: parseInt(productId),
          variantId: variantId ? parseInt(variantId) : null,
        },
      });

      if (!stock || stock.quantity < qty) {
        throw new Error("Insufficient stock in warehouse to log damage write-off");
      }

      await tx.warehouseStock.update({
        where: { id: stock.id },
        data: { quantity: { decrement: qty } },
      });

      // 2. Save Log
      return await tx.damagedGoods.create({
        data: {
          warehouseId: parseInt(warehouseId),
          productId: parseInt(productId),
          variantId: variantId ? parseInt(variantId) : null,
          quantity: qty,
          reason,
          loggedBy: req.user!.id,
        },
      });
    });

    return res.status(201).json(log);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// 6. DASHBOARD & STATS
export const getDashboardStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const warehousesCount = await prisma.warehouse.count();
    const activeTransfersCount = await prisma.stockTransfer.count({ where: { status: "PENDING" } });
    const productionCount = await prisma.productionOrder.count();

    const stocks = await prisma.warehouseStock.findMany({
      include: { product: { select: { cost: true } } },
    });
    const valuation = stocks.reduce((sum, s) => sum + s.quantity * s.product.cost, 0);

    return res.status(200).json({
      warehousesCount,
      activeTransfersCount,
      productionCount,
      valuation,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to compile warehouse stats", error: error.message });
  }
};
