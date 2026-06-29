import { Router } from "express";
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getPurchaseOrders,
  createPurchaseOrder,
  approvePurchaseOrder,
  processGRN,
  processPurchaseReturn,
  getSupplierStatements,
  recordSupplierPayment
} from "../controllers/purchasing.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

// Suppliers
router.get("/suppliers", getSuppliers);
router.post("/suppliers", createSupplier);
router.put("/suppliers/:id", updateSupplier);
router.delete("/suppliers/:id", deleteSupplier);

// Purchase Orders
router.get("/orders", getPurchaseOrders);
router.post("/orders", createPurchaseOrder);
router.put("/orders/:id/approve", approvePurchaseOrder);

// GRN & Returns
router.post("/grn", processGRN);
router.post("/returns", processPurchaseReturn);

// Financial Statements & Payments
router.get("/suppliers/:id/statement", getSupplierStatements);
router.post("/payments", recordSupplierPayment);

export default router;
