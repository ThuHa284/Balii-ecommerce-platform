import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { OAuthAccount } from '../entities/oauth-account.entity';
import { Role } from '../entities/role.entity';
import { User } from '../entities/user.entity';

export type GoogleUserProfile = {
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
  avatarUrl?: string;
};

@Injectable()
export class GoogleAccountService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async validate(profile: GoogleUserProfile): Promise<User> {
    const normalizedEmail = profile.email.trim().toLowerCase();
    if (!profile.providerUserId || !normalizedEmail || !profile.emailVerified) {
      throw new UnauthorizedException(
        'Google khong cung cap email da duoc xac minh',
      );
    }

    const userId = await this.userRepo.manager.transaction(async (manager) => {
      const oauthAccountRepo = manager.getRepository(OAuthAccount);
      const userRepo = manager.getRepository(User);
      const roleRepo = manager.getRepository(Role);
      const linkedAccount = await oauthAccountRepo.findOne({
        where: {
          provider: 'google',
          providerUserId: profile.providerUserId,
        },
      });

      if (linkedAccount) {
        return linkedAccount.userId;
      }

      let user = await userRepo.findOne({
        where: { email: normalizedEmail },
      });

      if (!user) {
        const customerRole = await roleRepo.findOne({
          where: { name: 'CUSTOMER' },
        });
        if (!customerRole) {
          throw new BadRequestException('Khong tim thay vai tro CUSTOMER');
        }

        user = userRepo.create({
          email: normalizedEmail,
          fullName: profile.fullName.trim() || normalizedEmail.split('@')[0],
          avatarUrl: profile.avatarUrl,
          roleId: customerRole.id,
          emailVerifiedAt: new Date(),
        });
        await userRepo.save(user);
      } else {
        if (!user.isActive) {
          throw new UnauthorizedException('Tai khoan da bi khoa');
        }

        if (!user.emailVerifiedAt || (!user.avatarUrl && profile.avatarUrl)) {
          user.emailVerifiedAt = user.emailVerifiedAt || new Date();
          if (!user.avatarUrl && profile.avatarUrl) {
            user.avatarUrl = profile.avatarUrl;
          }
          await userRepo.save(user);
        }
      }

      await oauthAccountRepo.save(
        oauthAccountRepo.create({
          userId: user.id,
          provider: 'google',
          providerUserId: profile.providerUserId,
        }),
      );

      return user.id;
    });

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { role: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Tai khoan khong ton tai hoac da bi khoa',
      );
    }

    return user;
  }
}
