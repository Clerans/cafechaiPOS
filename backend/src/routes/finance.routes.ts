import { Router } from "express";
import {
  getBankAccounts,
  createBankAccount,
  getFinancialTransactions,
  recordTransaction,
  getProfitLossStatement,
  getSpecializedReports
} from "../controllers/finance.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

// Bank Accounts
router.get("/accounts", getBankAccounts);
router.post("/accounts", createBankAccount);

// Transaction Ledgers
router.get("/transactions", getFinancialTransactions);
router.post("/transactions", recordTransaction);

// Profit and Loss calculations
router.get("/profit-loss", getProfitLossStatement);

// Special analytics reports
router.get("/reports", getSpecializedReports);

export default router;
