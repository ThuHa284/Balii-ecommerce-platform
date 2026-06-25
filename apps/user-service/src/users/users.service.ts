import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { role: true },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }

    const { passwordHash, ...safeUser } = user;
    void passwordHash;
    return safeUser;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
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

  async updateUserRole(
    actingUserId: string,
    targetUserId: string,
    nextRoleName: 'customer' | 'admin' | 'super_admin',
  ) {
    const [actingUser, targetUser, nextRole] = await Promise.all([
      this.userRepo.findOne({
        where: { id: actingUserId },
        relations: { role: true },
      }),
      this.userRepo.findOne({
        where: { id: targetUserId },
        relations: { role: true },
      }),
      this.roleRepo.findOne({
        where: { name: nextRoleName.toUpperCase() },
      }),
    ]);

    if (!actingUser) {
      throw new NotFoundException('Không tìm thấy người dùng thực hiện');
    }

    if (!targetUser) {
      throw new NotFoundException('Không tìm thấy người dùng cần phân quyền');
    }

    if (!nextRole) {
      throw new NotFoundException('Không tìm thấy vai trò cần gán');
    }

    if (
      actingUser.id === targetUser.id &&
      actingUser.role?.name === 'SUPER_ADMIN' &&
      nextRole.name !== 'SUPER_ADMIN'
    ) {
      throw new BadRequestException(
        'Không thể tự hạ quyền của chính tài khoản superadmin.',
      );
    }

    targetUser.roleId = nextRole.id;
    await this.userRepo.save(targetUser);

    return this.userRepo.findOne({
      where: { id: targetUserId },
      relations: { role: true },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(dto.oldPassword, user.passwordHash);

    if (!isMatch) {
      throw new BadRequestException('Mật khẩu cũ không chính xác');
    }

    const samePassword = await bcrypt.compare(
      dto.newPassword,
      user.passwordHash,
    );

    if (samePassword) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu cũ');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.userRepo.save(user);

    return {
      message: 'Đổi mật khẩu thành công',
    };
  }
}
