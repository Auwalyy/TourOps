import { User, IUser } from '../models/User';
import { BaseRepository } from './base.repository';

class UserRepository extends BaseRepository<IUser> {
  constructor() {
    super(User);
  }

  async findByEmail(email: string, withPassword = false): Promise<IUser | null> {
    const query = User.findOne({ email: email.toLowerCase() });
    if (withPassword) query.select('+password +refreshTokens');
    return query.exec();
  }

  async findByResetToken(hashedToken: string): Promise<IUser | null> {
    return User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    })
      .select('+passwordResetToken +passwordResetExpires')
      .exec();
  }

  async findByAgency(agencyId: string): Promise<IUser[]> {
    return User.find({ agencyId, isActive: true }).select('-password').exec();
  }

  async findByIdWithTokens(id: string): Promise<IUser | null> {
    return User.findById(id).select('+refreshTokens +rotatedRefreshTokens').exec();
  }

  async addRefreshToken(userId: string, token: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      // Keep the 10 most recent sessions; older devices simply sign in again.
      $push: { refreshTokens: { $each: [token], $slice: -10 } },
      lastLogin: new Date(),
    });
  }

  async removeRefreshToken(userId: string, token: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { $pull: { refreshTokens: token, rotatedRefreshTokens: { token } } });
  }

  /** Retires a token on rotation but remembers it briefly for requests already in flight. */
  async rotateRefreshToken(userId: string, token: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: token },
      $push: { rotatedRefreshTokens: { $each: [{ token, rotatedAt: new Date() }], $slice: -20 } },
    });
  }

  async clearRefreshTokens(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { $set: { refreshTokens: [], rotatedRefreshTokens: [] } });
  }
}

export const userRepository = new UserRepository();
