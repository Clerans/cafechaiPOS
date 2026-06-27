import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';

const assignPermissionsSchema = z.object({
  permissionIds: z.array(z.number().int()),
});

export const getRoles = async (req: Request, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });
    return res.status(200).json(roles);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to retrieve roles', error: error.message });
  }
};

export const getPermissions = async (req: Request, res: Response) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: { id: 'asc' },
    });
    return res.status(200).json(permissions);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to retrieve permissions', error: error.message });
  }
};

export const updateRolePermissions = async (req: Request, res: Response) => {
  try {
    const roleId = parseInt(req.params.id);
    if (isNaN(roleId)) {
      return res.status(400).json({ message: 'Invalid Role ID' });
    }

    const parsed = assignPermissionsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation error', errors: parsed.error.format() });
    }

    const { permissionIds } = parsed.data;

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Wrap in transaction: clear existing permissions, add new ones
    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { roleId },
      });

      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((permId) => ({
            roleId,
            permissionId: permId,
          })),
        });
      }
    });

    const updatedRole = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return res.status(200).json(updatedRole);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to update role permissions', error: error.message });
  }
};
