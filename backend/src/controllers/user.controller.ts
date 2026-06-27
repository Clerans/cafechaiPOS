import { Request, Response } from 'express';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  roleId: z.number().int(),
  branchId: z.number().int().nullable().optional(),
  profileImage: z.string().url().optional().nullable(),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  roleId: z.number().int().optional(),
  branchId: z.number().int().nullable().optional(),
  profileImage: z.string().url().optional().nullable(),
});

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        role: true,
        branch: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Exclude password hashes
    const sanitizedUsers = users.map(({ passwordHash, ...user }) => user);
    return res.status(200).json(sanitizedUsers);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to retrieve users', error: error.message });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid User ID' });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        branch: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { passwordHash, ...sanitized } = user;
    return res.status(200).json(sanitized);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to retrieve user', error: error.message });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation error', errors: parsed.error.format() });
    }

    const data = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email address is already in use' });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        status: data.status,
        roleId: data.roleId,
        branchId: data.branchId || null,
        profileImage: data.profileImage || null,
      },
      include: {
        role: true,
        branch: true,
      },
    });

    const { passwordHash, ...sanitized } = newUser;
    return res.status(201).json(sanitized);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to create user', error: error.message });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid User ID' });
    }

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation error', errors: parsed.error.format() });
    }

    const data = parsed.data;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (data.email && data.email !== user.email) {
      const existingEmail = await prisma.user.findUnique({ where: { email: data.email } });
      if (existingEmail) {
        return res.status(400).json({ message: 'Email address already in use' });
      }
    }

    const updatePayload: any = { ...data };
    delete updatePayload.password;

    if (data.password) {
      updatePayload.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updatePayload,
      include: {
        role: true,
        branch: true,
      },
    });

    const { passwordHash, ...sanitized } = updatedUser;
    return res.status(200).json(sanitized);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to update user', error: error.message });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid User ID' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Do not delete the last active Super Admin, or prevent self-deletion
    // But for a generic setup, let's just do a normal check or straight deletion
    await prisma.user.delete({ where: { id } });
    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
};
