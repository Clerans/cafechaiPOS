import { Router } from "express";
import {
  getWarehouses,
  createWarehouse,
  getWarehouseStocks,
  getTransfers,
  createTransfer,
  approveTransfer,
  getProductionOrders,
  createProductionOrder,
  getDamagedGoods,
  createDamagedGoods,
  getDashboardStats
} from "../controllers/warehouse.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

// Warehouses Info & Stats
router.get("/", getWarehouses);
router.post("/", createWarehouse);
router.get("/dashboard", getDashboardStats);

// Stocks level audit
router.get("/stocks", getWarehouseStocks);

// Transfers
router.get("/transfers", getTransfers);
router.post("/transfers", createTransfer);
router.put("/transfers/:id/approve", approveTransfer);

// Production Manufacturing
router.get("/production", getProductionOrders);
router.post("/production", createProductionOrder);

// Damaged goods audit logs
router.get("/damaged", getDamagedGoods);
router.post("/damaged", createDamagedGoods);

export default router;
