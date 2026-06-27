import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';

const updateSettingsSchema = z.object({
  companyName: z.string().min(1).optional(),
  logo: z.string().optional().nullable(),
  currency: z.string().min(1).optional(),
  timezone: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  receiptFooter: z.string().optional().nullable(),
});

export const getSettings = async (req: Request, res: Response) => {
  try {
    let settings = await prisma.companySettings.findFirst();
    if (!settings) {
      // Create defaults if not found
      settings = await prisma.companySettings.create({
        data: {
          companyName: 'Enterprise Solutions Inc.',
          currency: 'USD',
          timezone: 'America/New_York',
          language: 'en',
          taxRate: 8.25,
          receiptFooter: 'Thank you for shopping with us!',
        },
      });
    }
    return res.status(200).json(settings);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to retrieve settings', error: error.message });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const parsed = updateSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation error', errors: parsed.error.format() });
    }

    const data = parsed.data;

    let settings = await prisma.companySettings.findFirst();

    if (!settings) {
      settings = await prisma.companySettings.create({
        data: {
          companyName: data.companyName || 'Enterprise Solutions Inc.',
          logo: data.logo || '',
          currency: data.currency || 'USD',
          timezone: data.timezone || 'America/New_York',
          language: data.language || 'en',
          taxRate: data.taxRate !== undefined ? data.taxRate : 8.25,
          receiptFooter: data.receiptFooter || 'Thank you for shopping with us!',
        },
      });
    } else {
      settings = await prisma.companySettings.update({
        where: { id: settings.id },
        data,
      });
    }

    return res.status(200).json(settings);
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to update settings', error: error.message });
  }
};
