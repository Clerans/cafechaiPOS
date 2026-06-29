import { Router } from "express";
import {
  getHRStats,
  getDepartments,
  createDepartment,
  getDesignations,
  createDesignation,
  clockInOut,
  getAttendances,
  getLeaves,
  createLeave,
  approveLeave,
  getPayrolls,
  generatePayroll,
  paySalary,
  getShifts,
  createShift,
  assignShift
} from "../controllers/hr.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

// Info & Dashboard stats
router.get("/dashboard", getHRStats);

// Org components
router.get("/departments", getDepartments);
router.post("/departments", createDepartment);
router.get("/designations", getDesignations);
router.post("/designations", createDesignation);

// Clocking
router.post("/attendance/clock", clockInOut);
router.get("/attendance", getAttendances);

// Leaves management
router.get("/leaves", getLeaves);
router.post("/leaves", createLeave);
router.put("/leaves/:id/approve", approveLeave);

// Payroll
router.get("/payroll", getPayrolls);
router.post("/payroll", generatePayroll);
router.put("/payroll/:id/pay", paySalary);

// Shifts Scheduler
router.get("/shifts", getShifts);
router.post("/shifts", createShift);
router.post("/shifts/assign", assignShift);

export default router;
