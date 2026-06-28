import { Router } from "express";
import {
  processCheckout,
  holdOrder,
  getHeldOrders,
  deleteHeldOrder,
  voidTransaction,
  getGiftCard
} from "../controllers/pos.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.post("/checkout", processCheckout);
router.post("/hold", holdOrder);
router.get("/held", getHeldOrders);
router.delete("/held/:id", deleteHeldOrder);
router.post("/void/:id", voidTransaction);
router.get("/gift-cards/:code", getGiftCard);

export default router;
