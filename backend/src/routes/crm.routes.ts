import { Router } from "express";
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerGroups,
  createCustomerGroup,
  adjustWallet,
  redeemPoints,
  getCampaigns,
  createCampaign,
  getCustomerStatement
} from "../controllers/crm.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

// Customers CRUD
router.get("/customers", getCustomers);
router.post("/customers", createCustomer);
router.put("/customers/:id", updateCustomer);
router.delete("/customers/:id", deleteCustomer);

// Customer Groups
router.get("/groups", getCustomerGroups);
router.post("/groups", createCustomerGroup);

// Wallets & Loyalty points
router.post("/wallet/adjust", adjustWallet);
router.post("/loyalty/redeem", redeemPoints);

// Statements & Marketing Campaigns
router.get("/customers/:id/statement", getCustomerStatement);
router.get("/campaigns", getCampaigns);
router.post("/campaigns", createCampaign);

export default router;
