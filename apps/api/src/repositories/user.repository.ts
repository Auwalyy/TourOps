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

  async addRefreshToken(userId: string, token: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      $push: { refreshTokens: token },
      lastLogin: new Date(),
    });
  }

  async removeRefreshToken(userId: string, token: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { $pull: { refreshTokens: token } });
  }

  async clearRefreshTokens(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { $set: { refreshTokens: [] } });
  }
}

export const userRepository = new UserRepository();
