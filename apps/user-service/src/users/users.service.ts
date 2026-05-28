import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { role: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }

    // remove sensitive field before returning
    delete (user as any).passwordHash;

    return user;
  }

  async updateProfile(userId: string, dto: any) {
    await this.userRepo.update(userId, {
      fullName: dto.fullName,
      phone: dto.phone,
      avatarUrl: dto.avatarUrl,
    });

    return this.getProfile(userId);
  }

  async findAll() {
    return this.userRepo.find({
      relations: { role: true },
      order: { createdAt: 'DESC' },
    });
  }
}