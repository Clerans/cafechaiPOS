import { Router } from "express";
import { getSummary, getCharts, getTables } from "../controllers/dashboard.controller";
import { authenticate, hasPermission } from "../middleware/auth";

const router = Router();

router.use(authenticate);
router.use(hasPermission("view:reports"));

router.get("/summary", getSummary);
router.get("/charts", getCharts);
router.get("/tables", getTables);

export default router;
