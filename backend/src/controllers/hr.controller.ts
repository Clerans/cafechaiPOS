import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../utils/prisma";

// 1. HR DASHBOARD STATS
export const getHRStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employeesCount = await prisma.user.count({ where: { status: "ACTIVE" } });
    
    // Count checked-in users today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const presentCount = await prisma.attendance.count({
      where: {
        clockIn: { gte: todayStart },
      },
    });

    const pendingLeaves = await prisma.leave.count({ where: { status: "PENDING" } });

    const basicPayrollSum = await prisma.payroll.aggregate({
      _sum: { netSalary: true },
      where: { status: "PENDING" },
    });

    return res.status(200).json({
      employeesCount,
      presentCount,
      pendingLeaves,
      pendingPayrollSum: basicPayrollSum._sum.netSalary || 0,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to compile HR stats", error: error.message });
  }
};

// 2. DEPARTMENTS
export const getDepartments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await prisma.department.findMany({ orderBy: { name: "asc" } });
    return res.status(200).json(list);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load departments", error: error.message });
  }
};

export const createDepartment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) return res.status(400).json({ message: "Name and code are required" });

    const item = await prisma.department.create({ data: { name, code } });
    return res.status(201).json(item);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to create department", error: error.message });
  }
};

// 3. DESIGNATIONS
export const getDesignations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await prisma.designation.findMany({ orderBy: { name: "asc" } });
    return res.status(200).json(list);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load designations", error: error.message });
  }
};

export const createDesignation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });

    const item = await prisma.designation.create({ data: { name } });
    return res.status(201).json(item);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to create designation", error: error.message });
  }
};

// 4. CLOCKING & ATTENDANCE
export const clockInOut = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Look for active checkin today
    const attendance = await prisma.attendance.findFirst({
      where: {
        userId,
        clockIn: { gte: todayStart },
      },
    });

    if (!attendance) {
      // Clock IN
      // Calculate if LATE (e.g. checkin after 09:15 AM)
      const now = new Date();
      const limit = new Date();
      limit.setHours(9, 15, 0, 0);
      const status = now.getTime() > limit.getTime() ? "LATE" : "PRESENT";

      const record = await prisma.attendance.create({
        data: {
          userId,
          status,
        },
      });
      return res.status(201).json({ message: "Clock-in successful", record });
    } else {
      if (attendance.clockOut) {
        return res.status(400).json({ message: "Already clocked out for today" });
      }
      // Clock OUT
      const record = await prisma.attendance.update({
        where: { id: attendance.id },
        data: { clockOut: new Date() },
      });
      return res.status(200).json({ message: "Clock-out successful", record });
    }
  } catch (error: any) {
    return res.status(500).json({ message: "Attendance action failed", error: error.message });
  }
};

export const getAttendances = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await prisma.attendance.findMany({
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { clockIn: "desc" },
    });
    return res.status(200).json(list);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load attendance log", error: error.message });
  }
};

// 5. LEAVES
export const getLeaves = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await prisma.leave.findMany({
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json(list);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load leave logs", error: error.message });
  }
};

export const createLeave = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    if (!leaveType || !startDate || !endDate) {
      return res.status(400).json({ message: "Missing leave parameters" });
    }

    const item = await prisma.leave.create({
      data: {
        userId: req.user!.id,
        leaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: "PENDING",
        reason,
      },
    });

    return res.status(201).json(item);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to submit leave request", error: error.message });
  }
};

export const approveLeave = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body; // APPROVED or REJECTED

    const item = await prisma.leave.update({
      where: { id },
      data: {
        status,
        approvedBy: req.user!.id,
      },
    });

    return res.status(200).json(item);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to review leave", error: error.message });
  }
};

// 6. PAYROLL MANAGEMENT
export const getPayrolls = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await prisma.payroll.findMany({
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json(list);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load payroll list", error: error.message });
  }
};

export const generatePayroll = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, month, year, basicSalary, allowances, deductions } = req.body;
    if (!userId || !month || !year || !basicSalary) {
      return res.status(400).json({ message: "Missing payroll parameters" });
    }

    const sal = parseFloat(basicSalary);
    const allow = allowances ? parseFloat(allowances) : 0;
    const deduct = deductions ? parseFloat(deductions) : 0;
    const netSalary = sal + allow - deduct;

    const item = await prisma.payroll.create({
      data: {
        userId: parseInt(userId),
        month,
        year: parseInt(year),
        basicSalary: sal,
        allowances: allow,
        deductions: deduct,
        netSalary,
        status: "PENDING",
      },
    });

    return res.status(201).json(item);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to generate payroll invoice", error: error.message });
  }
};

export const paySalary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    const item = await prisma.payroll.update({
      where: { id },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
    });

    return res.status(200).json(item);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to process payroll disbursement", error: error.message });
  }
};

// 7. SHIFTS
export const getShifts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await prisma.shift.findMany({
      include: {
        employeeShifts: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });
    return res.status(200).json(list);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to load shifts", error: error.message });
  }
};

export const createShift = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, startTime, endTime } = req.body;
    if (!name || !startTime || !endTime) {
      return res.status(400).json({ message: "Shift details are required" });
    }

    const item = await prisma.shift.create({
      data: { name, startTime, endTime },
    });
    return res.status(201).json(item);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to create shift schedule type", error: error.message });
  }
};

export const assignShift = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, shiftId, date } = req.body;
    if (!userId || !shiftId || !date) {
      return res.status(400).json({ message: "Missing assignment inputs" });
    }

    const item = await prisma.employeeShift.create({
      data: {
        userId: parseInt(userId),
        shiftId: parseInt(shiftId),
        date: new Date(date),
      },
    });

    return res.status(201).json(item);
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to assign schedule shift", error: error.message });
  }
};
