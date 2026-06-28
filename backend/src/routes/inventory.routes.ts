import { Router } from "express";
import {
  getBrands, createBrand, updateBrand, deleteBrand,
  getUnits, createUnit, updateUnit, deleteUnit,
  getProducts, createProduct, updateProduct, deleteProduct,
  getBatches, createBatch,
  getRawMaterials, createRawMaterial,
  getRecipes, createRecipe,
  getStockMovements, createAdjustment,
  getCycleCounts, createCycleCount
} from "../controllers/inventory.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

// Brands Routes
router.get("/brands", getBrands);
router.post("/brands", createBrand);
router.put("/brands/:id", updateBrand);
router.delete("/brands/:id", deleteBrand);

// Units Routes
router.get("/units", getUnits);
router.post("/units", createUnit);
router.put("/units/:id", updateUnit);
router.delete("/units/:id", deleteUnit);

// Products Routes
router.get("/products", getProducts);
router.post("/products", createProduct);
router.put("/products/:id", updateProduct);
router.delete("/products/:id", deleteProduct);

// Batches Routes
router.get("/batches", getBatches);
router.post("/batches", createBatch);

// Raw Materials Routes
router.get("/raw-materials", getRawMaterials);
router.post("/raw-materials", createRawMaterial);

// Recipes Routes
router.get("/recipes", getRecipes);
router.post("/recipes", createRecipe);

// Movements & Adjustments
router.get("/movements", getStockMovements);
router.post("/adjustments", createAdjustment);

// Cycle Counts
router.get("/cycle-counts", getCycleCounts);
router.post("/cycle-counts", createCycleCount);

export default router;
