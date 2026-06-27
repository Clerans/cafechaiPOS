import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';

const createBranchSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().min(1),
  managerId: z.number().int().nullable().optional(),
});

const updateBranchSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  managerId: z.number().int().nullable().optional(),
});

export const getBranches = async (req: Request, res: Response) => {
  try {
    const branches = await prisma.branch.findMany({
      include: {
        manager: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json(branches);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to retrieve branches', error: error.message });
  }
};

export const getBranchById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid Branch ID' });
    }

    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        manager: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    return res.status(200).json(branch);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to retrieve branch', error: error.message });
  }
};

export const createBranch = async (req: Request, res: Response) => {
  try {
    const parsed = createBranchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation error', errors: parsed.error.format() });
    }

    const data = parsed.data;

    const existingBranch = await prisma.branch.findUnique({
      where: { code: data.code },
    });

    if (existingBranch) {
      return res.status(400).json({ message: 'Branch code already exists' });
    }

    const newBranch = await prisma.branch.create({
      data: {
        name: data.name,
        code: data.code,
        address: data.address,
        phone: data.phone,
        managerId: data.managerId || null,
      },
      include: {
        manager: true,
      },
    });

    return res.status(201).json(newBranch);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to create branch', error: error.message });
  }
};

export const updateBranch = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid Branch ID' });
    }

    const parsed = updateBranchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation error', errors: parsed.error.format() });
    }

    const data = parsed.data;

    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    if (data.code && data.code !== branch.code) {
      const existingBranch = await prisma.branch.findUnique({ where: { code: data.code } });
      if (existingBranch) {
        return res.status(400).json({ message: 'Branch code already in use' });
      }
    }

    const updatedBranch = await prisma.branch.update({
      where: { id },
      data,
      include: {
        manager: true,
      },
    });

    return res.status(200).json(updatedBranch);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to update branch', error: error.message });
  }
};

export const deleteBranch = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid Branch ID' });
    }

    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    await prisma.branch.delete({ where: { id } });
    return res.status(200).json({ message: 'Branch deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to delete branch', error: error.message });
  }
};
