import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../utils/prisma";
import { cache } from "../utils/cache";

// Helper: Invalidate dashboard caching when stocks alter
const invalidateDashboardCache = () => {
  cache.invalidatePrefix("dashboard:");
};

// 1. BRANDS CRUD
export const getBrands = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const brands = await prisma.brand.findMany({ orderBy: { name: "asc" } });
    return res.status(200).json(brands);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load brands", error: error.message });
  }
};

export const createBrand = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Brand name is required" });

    const brand = await prisma.brand.create({ data: { name } });
    return res.status(201).json(brand);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to create brand", error: error.message });
  }
};

export const updateBrand = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name } = req.body;
    const brand = await prisma.brand.update({ where: { id }, data: { name } });
    return res.status(200).json(brand);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update brand", error: error.message });
  }
};

export const deleteBrand = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.brand.delete({ where: { id } });
    return res.status(200).json({ message: "Brand deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to delete brand", error: error.message });
  }
};

// 2. UNITS CRUD
export const getUnits = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const units = await prisma.unit.findMany({ orderBy: { name: "asc" } });
    return res.status(200).json(units);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load units", error: error.message });
  }
};

export const createUnit = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, shortName } = req.body;
    if (!name || !shortName) return res.status(400).json({ message: "Name and shortName are required" });

    const unit = await prisma.unit.create({ data: { name, shortName } });
    return res.status(201).json(unit);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to create unit", error: error.message });
  }
};

export const updateUnit = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, shortName } = req.body;
    const unit = await prisma.unit.update({ where: { id }, data: { name, shortName } });
    return res.status(200).json(unit);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update unit", error: error.message });
  }
};

export const deleteUnit = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.unit.delete({ where: { id } });
    return res.status(200).json({ message: "Unit deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to delete unit", error: error.message });
  }
};

// 3. PRODUCTS & VARIANTS CRUD
export const getProducts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = (req.query.search as string) || "";
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
    const brandId = req.query.brandId ? parseInt(req.query.brandId as string) : undefined;
    const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
    const stockAlert = req.query.stockAlert === "true";
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder = (req.query.sortOrder as "asc" | "desc") || "desc";

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Filters formulation
    const where: any = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ],
    };

    if (categoryId) where.categoryId = categoryId;
    if (brandId) where.brandId = brandId;
    if (branchId) where.branchId = branchId;
    if (stockAlert) {
      where.stock = { lte: prisma.product.fields.threshold };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          brand: true,
          unit: true,
          images: true,
          variants: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return res.status(200).json({
      data: products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load products list", error: error.message });
  }
};

export const createProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      sku,
      price,
      cost,
      stock,
      threshold,
      expiryDate,
      categoryId,
      brandId,
      unitId,
      branchId,
      images,
      variants,
    } = req.body;

    if (!name || !sku || price === undefined || cost === undefined || stock === undefined || !categoryId) {
      return res.status(400).json({ message: "Missing required core product details" });
    }

    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          name,
          sku,
          price: parseFloat(price),
          cost: parseFloat(cost),
          stock: parseInt(stock),
          threshold: threshold ? parseInt(threshold) : 10,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          categoryId: parseInt(categoryId),
          brandId: brandId ? parseInt(brandId) : null,
          unitId: unitId ? parseInt(unitId) : null,
          branchId: branchId ? parseInt(branchId) : null,
          images: images && images.length > 0 ? {
            create: images.map((img: any) => ({
              imageUrl: img.imageUrl,
              isPrimary: !!img.isPrimary,
            })),
          } : undefined,
          variants: variants && variants.length > 0 ? {
            create: variants.map((v: any) => ({
              sku: v.sku,
              name: v.name,
              barcode: v.barcode || null,
              price: parseFloat(v.price),
              cost: parseFloat(v.cost),
              stock: parseInt(v.stock),
              threshold: v.threshold ? parseInt(v.threshold) : 10,
            })),
          } : undefined,
        },
        include: {
          images: true,
          variants: true,
        },
      });

      // Audit movement log
      await tx.stockMovement.create({
        data: {
          productId: p.id,
          type: "IN",
          quantity: p.stock,
          userId: req.user!.id,
          reason: "Product created initial stock entry",
        },
      });

      return p;
    });

    invalidateDashboardCache();
    return res.status(201).json(product);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to create product", error: error.message });
  }
};

export const updateProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const {
      name,
      sku,
      price,
      cost,
      stock,
      threshold,
      expiryDate,
      categoryId,
      brandId,
      unitId,
      branchId,
      images,
      variants,
    } = req.body;

    const product = await prisma.$transaction(async (tx) => {
      // Load current product to audit stock difference
      const current = await tx.product.findUnique({ where: { id } });
      if (!current) throw new Error("Product not found");

      // Invalidate existing images / variants to drop replacement inputs
      if (images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
      }
      if (variants) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
      }

      const p = await tx.product.update({
        where: { id },
        data: {
          name,
          sku,
          price: price !== undefined ? parseFloat(price) : undefined,
          cost: cost !== undefined ? parseFloat(cost) : undefined,
          stock: stock !== undefined ? parseInt(stock) : undefined,
          threshold: threshold !== undefined ? parseInt(threshold) : undefined,
          expiryDate: expiryDate !== undefined ? (expiryDate ? new Date(expiryDate) : null) : undefined,
          categoryId: categoryId ? parseInt(categoryId) : undefined,
          brandId: brandId ? parseInt(brandId) : null,
          unitId: unitId ? parseInt(unitId) : null,
          branchId: branchId ? parseInt(branchId) : null,
          images: images && images.length > 0 ? {
            create: images.map((img: any) => ({
              imageUrl: img.imageUrl,
              isPrimary: !!img.isPrimary,
            })),
          } : undefined,
          variants: variants && variants.length > 0 ? {
            create: variants.map((v: any) => ({
              sku: v.sku,
              name: v.name,
              barcode: v.barcode || null,
              price: parseFloat(v.price),
              cost: parseFloat(v.cost),
              stock: parseInt(v.stock),
              threshold: v.threshold ? parseInt(v.threshold) : 10,
            })),
          } : undefined,
        },
        include: {
          images: true,
          variants: true,
        },
      });

      // Audit movement diff if stock updated
      if (stock !== undefined && parseInt(stock) !== current.stock) {
        const diff = parseInt(stock) - current.stock;
        await tx.stockMovement.create({
          data: {
            productId: p.id,
            type: diff > 0 ? "IN" : "OUT",
            quantity: Math.abs(diff),
            userId: req.user!.id,
            reason: `Product stock manually updated from ${current.stock} to ${stock}`,
          },
        });
      }

      return p;
    });

    invalidateDashboardCache();
    return res.status(200).json(product);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update product", error: error.message });
  }
};

export const deleteProduct = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.product.delete({ where: { id } });
    invalidateDashboardCache();
    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to delete product", error: error.message });
  }
};

// 4. BATCHES CRUD & EXPIRATION PANELS
export const getBatches = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const batches = await prisma.batch.findMany({
      include: {
        product: { select: { name: true, sku: true } },
        variant: { select: { name: true, sku: true } },
      },
      orderBy: { expiryDate: "asc" },
    });
    return res.status(200).json(batches);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load batches", error: error.message });
  }
};

export const createBatch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId, variantId, batchNumber, quantity, cost, price, expiryDate } = req.body;
    if (!productId || !batchNumber || !quantity || !cost || !price) {
      return res.status(400).json({ message: "Missing required batch parameters" });
    }

    const batch = await prisma.$transaction(async (tx) => {
      const b = await tx.batch.create({
        data: {
          productId: parseInt(productId),
          variantId: variantId ? parseInt(variantId) : null,
          batchNumber,
          quantity: parseInt(quantity),
          cost: parseFloat(cost),
          price: parseFloat(price),
          expiryDate: expiryDate ? new Date(expiryDate) : null,
        },
      });

      // Update core/variant product stocks
      if (variantId) {
        await tx.productVariant.update({
          where: { id: parseInt(variantId) },
          data: { stock: { increment: parseInt(quantity) } },
        });
      } else {
        await tx.product.update({
          where: { id: parseInt(productId) },
          data: { stock: { increment: parseInt(quantity) } },
        });
      }

      await tx.stockMovement.create({
        data: {
          productId: parseInt(productId),
          variantId: variantId ? parseInt(variantId) : null,
          type: "IN",
          quantity: parseInt(quantity),
          userId: req.user!.id,
          reason: `Added new batch number: ${batchNumber}`,
        },
      });

      return b;
    });

    invalidateDashboardCache();
    return res.status(201).json(batch);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to create batch", error: error.message });
  }
};

// 5. RAW MATERIALS & RECIPES
export const getRawMaterials = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const raw = await prisma.rawMaterial.findMany({ orderBy: { name: "asc" } });
    return res.status(200).json(raw);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load raw materials", error: error.message });
  }
};

export const createRawMaterial = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, sku, unit, stock, cost } = req.body;
    if (!name || !sku || !unit || cost === undefined) {
      return res.status(400).json({ message: "Missing required raw materials keys" });
    }

    const raw = await prisma.rawMaterial.create({
      data: {
        name,
        sku,
        unit,
        stock: stock ? parseFloat(stock) : 0.0,
        cost: parseFloat(cost),
      },
    });
    return res.status(201).json(raw);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to create raw material", error: error.message });
  }
};

export const getRecipes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const recipes = await prisma.recipe.findMany({
      include: {
        product: { select: { name: true, sku: true } },
        variant: { select: { name: true, sku: true } },
        ingredients: {
          include: {
            rawMaterial: true,
          },
        },
      },
    });
    return res.status(200).json(recipes);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load recipes", error: error.message });
  }
};

export const createRecipe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId, variantId, name, description, ingredients } = req.body;
    if (!productId || !name || !ingredients || ingredients.length === 0) {
      return res.status(400).json({ message: "Missing required recipe options" });
    }

    const recipe = await prisma.recipe.create({
      data: {
        productId: parseInt(productId),
        variantId: variantId ? parseInt(variantId) : null,
        name,
        description,
        ingredients: {
          create: ingredients.map((ing: any) => ({
            rawMaterialId: parseInt(ing.rawMaterialId),
            quantityUsed: parseFloat(ing.quantityUsed),
          })),
        },
      },
      include: {
        ingredients: true,
      },
    });

    return res.status(201).json(recipe);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to create recipe", error: error.message });
  }
};

// 6. STOCK MOVEMENTS & ADJUSTMENTS
export const getStockMovements = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      include: {
        product: { select: { name: true, sku: true } },
        variant: { select: { name: true, sku: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json(movements);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load movement logs", error: error.message });
  }
};

export const createAdjustment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reason, type, items } = req.body; // type: INCREASE or DECREASE
    if (!reason || !type || !items || items.length === 0) {
      return res.status(400).json({ message: "Missing required adjustment parameters" });
    }

    const adjustment = await prisma.$transaction(async (tx) => {
      const adj = await tx.inventoryAdjustment.create({
        data: {
          reason,
          type,
          userId: req.user!.id,
          items: {
            create: items.map((item: any) => ({
              productId: parseInt(item.productId),
              variantId: item.variantId ? parseInt(item.variantId) : null,
              quantity: parseInt(item.quantity),
              cost: parseFloat(item.cost),
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Alter current stock levels
      for (const item of items) {
        const qtyMultiplier = type === "INCREASE" ? 1 : -1;
        const delta = parseInt(item.quantity) * qtyMultiplier;

        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: parseInt(item.variantId) },
            data: { stock: { increment: delta } },
          });
        } else {
          await tx.product.update({
            where: { id: parseInt(item.productId) },
            data: { stock: { increment: delta } },
          });
        }

        // Log movement entry
        await tx.stockMovement.create({
          data: {
            productId: parseInt(item.productId),
            variantId: item.variantId ? parseInt(item.variantId) : null,
            type: "ADJUSTMENT",
            quantity: parseInt(item.quantity),
            userId: req.user!.id,
            reason: `Stock adjusted (${type}): ${reason}`,
          },
        });
      }

      return adj;
    });

    invalidateDashboardCache();
    return res.status(201).json(adjustment);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to process stock adjustment", error: error.message });
  }
};

// 7. CYCLE COUNTS
export const getCycleCounts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const counts = await prisma.cycleCount.findMany({
      include: {
        items: {
          include: {
            product: { select: { name: true, sku: true } },
            variant: { select: { name: true, sku: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json(counts);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load cycle counts", error: error.message });
  }
};

export const createCycleCount = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, countedBy, items } = req.body;
    if (!title || !countedBy || !items || items.length === 0) {
      return res.status(400).json({ message: "Missing required cycle count variables" });
    }

    const cycleCount = await prisma.$transaction(async (tx) => {
      const count = await tx.cycleCount.create({
        data: {
          title,
          status: "COMPLETED",
          countedBy,
          items: {
            create: items.map((item: any) => ({
              productId: parseInt(item.productId),
              variantId: item.variantId ? parseInt(item.variantId) : null,
              systemStock: parseInt(item.systemStock),
              countedStock: parseInt(item.countedStock),
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Update system inventory quantities to counted stock quantities
      for (const item of items) {
        const sysVal = parseInt(item.systemStock);
        const countVal = parseInt(item.countedStock);
        const diff = countVal - sysVal;

        if (diff !== 0) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: parseInt(item.variantId) },
              data: { stock: countVal },
            });
          } else {
            await tx.product.update({
              where: { id: parseInt(item.productId) },
              data: { stock: countVal },
            });
          }

          // Register audit log movement diff
          await tx.stockMovement.create({
            data: {
              productId: parseInt(item.productId),
              variantId: item.variantId ? parseInt(item.variantId) : null,
              type: "ADJUSTMENT",
              quantity: Math.abs(diff),
              userId: req.user!.id,
              reason: `Cycle Count correction (${title}): System counted ${countVal} (was ${sysVal})`,
            },
          });
        }
      }

      return count;
    });

    invalidateDashboardCache();
    return res.status(201).json(cycleCount);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to create cycle count audit", error: error.message });
  }
};
