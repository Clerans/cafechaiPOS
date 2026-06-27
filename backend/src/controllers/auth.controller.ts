import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'enterprise_pos_jwt_secret_key_change_me_in_prod';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'enterprise_pos_jwt_refresh_secret_key_change_me_in_prod';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  token: z.string(),
  newPassword: z.string().min(6),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

// Helper: Generate Access and Refresh tokens
const generateTokens = async (user: any) => {
  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role.name,
      branchId: user.branchId,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN as any }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN as any }
  );

  // Expiry timestamp
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days matching token validation

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
};

export const login = async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid inputs', errors: parsed.error.format() });
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        branch: true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = await generateTokens(user);

    const permissions = user.role.permissions.map((rp) => rp.permission.code);

    return res.status(200).json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImage: user.profileImage,
        status: user.status,
        role: user.role.name,
        branch: user.branch ? { id: user.branch.id, name: user.branch.name, code: user.branch.code } : null,
        permissions,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revoked: true },
      });
    }
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Logout failed', error: error.message });
  }
};

export const refreshTokens = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    // Verify token in DB
    const savedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!savedToken || savedToken.revoked || savedToken.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    // Revoke current token
    await prisma.refreshToken.update({
      where: { id: savedToken.id },
      data: { revoked: true },
    });

    // Check user status
    if (savedToken.user.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'User is inactive' });
    }

    // Generate new token pair
    const tokens = await generateTokens(savedToken.user);

    return res.status(200).json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error: any) {
    return res.status(401).json({ message: 'Refresh token validation failed', error: error.message });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid email address' });
    }

    const { email } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Return 200 for security reasons to prevent user enumeration
      return res.status(200).json({ message: 'Password reset link sent if email exists' });
    }

    // Generate a mock reset token (in production, email this)
    const resetToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
    console.log(`[PASSWORD RESET MOCK LINK] Email: ${email}, Verification Token: ${resetToken}`);

    return res.status(200).json({
      message: 'Password reset link generated and printed to console log',
      token: resetToken,
    });
  } catch (error: any) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid inputs', errors: parsed.error.format() });
    }

    const { email, token, newPassword } = parsed.data;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
      if (decoded.email !== email) {
        return res.status(400).json({ message: 'Invalid reset token mapping' });
      }
    } catch {
      return res.status(400).json({ message: 'Expired or invalid token' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Revoke all existing sessions for safety
    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { revoked: true },
    });

    return res.status(200).json({ message: 'Password reset successful' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Reset failed', error: error.message });
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid inputs', errors: parsed.error.format() });
    }

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { oldPassword, newPassword } = parsed.data;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect old password' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Change failed', error: error.message });
  }
};
