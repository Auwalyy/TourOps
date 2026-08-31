import crypto from 'crypto';
import { userRepository } from '../repositories/user.repository';
import { Agency } from '../models/Agency';
import { tokenService } from './token.service';
import { emailService } from './email.service';
import { generateToken, hashToken } from '../utils/helpers';
import { AppError, ConflictError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { IUser } from '../models/User';

interface RegisterAgencyInput {
  agencyName: string;
  agencyEmail: string;
  agencyPhone: string;
  agencyAddress: string;
  agencyCountry: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  user: IUser;
}

export const authService = {
  async registerAgency(input: RegisterAgencyInput): Promise<TokenPair> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) throw new ConflictError('Email already registered');

    const agency = await Agency.create({
      name: input.agencyName,
      email: input.agencyEmail,
      phone: input.agencyPhone,
      address: input.agencyAddress,
      country: input.agencyCountry,
    });

    const user = await userRepository.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      password: input.password,
      role: 'agency_owner',
      agencyId: agency._id,
      isEmailVerified: true,
    });

    await emailService.sendWelcome(user.email, user.firstName, agency.name);
    return this._issueTokens(user);
  },

  async login(input: LoginInput): Promise<TokenPair> {
    const user = await userRepository.findByEmail(input.email.trim(), true);
    if (!user || !user.isActive) throw new UnauthorizedError('Invalid credentials');

    const valid = await user.comparePassword(input.password.trim());
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    return this._issueTokens(user);
  },

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    let payload;
    try {
      payload = tokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const user = await userRepository.findById(payload.userId);
    if (!user || !user.isActive) throw new UnauthorizedError('User not found');

    // Validate token is in user's stored list
    const userWithTokens = await userRepository.findOne({ _id: user._id });
    // Remove old, issue new
    await userRepository.removeRefreshToken(user.id, refreshToken);
    return this._issueTokens(user);
  },

  async logout(userId: string, refreshToken: string): Promise<void> {
    await userRepository.removeRefreshToken(userId, refreshToken);
  },

  async forgotPassword(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);
    if (!user) return; // Silent — don't reveal existence

    const token = generateToken();
    const hashed = hashToken(token);
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await userRepository.updateById(user.id, {
      passwordResetToken: hashed,
      passwordResetExpires: expires,
    });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    await emailService.sendPasswordReset(user.email, resetUrl);
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const hashed = hashToken(token);
    const user = await userRepository.findByResetToken(hashed);
    if (!user) throw new AppError('Invalid or expired reset token', 400);

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await (user as any).save();

    await userRepository.clearRefreshTokens(user.id);
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await userRepository.findOne({ _id: userId });
    if (!user) throw new NotFoundError('User');

    const userWithPw = await userRepository.findByEmail(user.email, true);
    if (!userWithPw) throw new NotFoundError('User');

    const valid = await userWithPw.comparePassword(currentPassword);
    if (!valid) throw new UnauthorizedError('Current password is incorrect');

    userWithPw.password = newPassword;
    await (userWithPw as any).save();
    await userRepository.clearRefreshTokens(userId);
  },

  async _issueTokens(user: IUser): Promise<TokenPair> {
    const payload = {
      userId: user.id,
      role: user.role,
      agencyId: user.agencyId?.toString(),
    };
    const accessToken = tokenService.generateAccessToken(payload);
    const refreshToken = tokenService.generateRefreshToken(payload);
    await userRepository.addRefreshToken(user.id, refreshToken);
    return { accessToken, refreshToken, user };
  },
};
