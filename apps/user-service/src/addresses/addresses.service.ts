import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { UserAddress } from '../entities/user-address.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(UserAddress)
    private readonly addressRepo: Repository<UserAddress>,
    private readonly dataSource: DataSource,
  ) {}

  findAll(userId: string) {
    return this.addressRepo.find({
      where: { userId },
      order: { isDefault: 'DESC' },
    });
  }

  async create(userId: string, dto: CreateAddressDto) {
    return this.dataSource.transaction(async (manager) => {
      await this.lockUser(manager, userId);
      await this.validateLocationHierarchy(manager, dto);

      const count = await manager.count(UserAddress, { where: { userId } });
      if (count >= 5) {
        throw new BadRequestException(
          'Mỗi tài khoản chỉ được lưu tối đa 5 địa chỉ.',
        );
      }

      const address = manager.create(UserAddress, {
        userId,
        ...dto,
        isDefault: count === 0,
      });
      return manager.save(address);
    });
  }

  async update(userId: string, id: string, dto: UpdateAddressDto) {
    return this.dataSource.transaction(async (manager) => {
      await this.lockUser(manager, userId);
      const address = await manager.findOne(UserAddress, {
        where: { id, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!address) {
        throw new NotFoundException('Không tìm thấy địa chỉ');
      }

      await this.validateLocationHierarchy(manager, {
        provinceId: dto.provinceId ?? address.provinceId,
        districtId: dto.districtId ?? address.districtId,
        wardId: dto.wardId ?? address.wardId,
      });
      Object.assign(address, dto);
      return manager.save(address);
    });
  }

  async remove(userId: string, id: string) {
    return this.dataSource.transaction(async (manager) => {
      await this.lockUser(manager, userId);
      const address = await manager.findOne(UserAddress, {
        where: { id, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!address) {
        throw new NotFoundException('Không tìm thấy địa chỉ');
      }

      const wasDefault = address.isDefault;
      await manager.remove(address);
      if (wasDefault) {
        await manager.query(
          `
          UPDATE user_service.user_addresses
          SET is_default = TRUE
          WHERE id = (
            SELECT id FROM user_service.user_addresses
            WHERE user_id = $1
            ORDER BY id
            LIMIT 1
          )
          `,
          [userId],
        );
      }
      return { message: 'Xóa địa chỉ thành công' };
    });
  }

  async setDefault(userId: string, id: string) {
    return this.dataSource.transaction(async (manager) => {
      await this.lockUser(manager, userId);
      const address = await manager.findOne(UserAddress, {
        where: { id, userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!address) {
        throw new NotFoundException('Không tìm thấy địa chỉ');
      }

      await manager.update(UserAddress, { userId }, { isDefault: false });

      await manager.update(UserAddress, { id, userId }, { isDefault: true });

      return manager.findOne(UserAddress, {
        where: { id, userId },
      });
    });
  }

  private async lockUser(
    manager: import('typeorm').EntityManager,
    userId: string,
  ) {
    const rows = await manager.query<Array<{ id: string }>>(
      `SELECT id FROM user_service.users WHERE id = $1 FOR UPDATE`,
      [userId],
    );
    if (!rows.length) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
  }

  private async validateLocationHierarchy(
    manager: import('typeorm').EntityManager,
    location: { provinceId: number; districtId: number; wardId: number },
  ) {
    const rows = await manager.query<Array<{ exists: number }>>(
      `
      SELECT 1
      FROM user_service.wards ward
      JOIN user_service.districts district ON district.id = ward.district_id
      WHERE ward.id = $1
        AND district.id = $2
        AND district.province_id = $3
      LIMIT 1
      `,
      [location.wardId, location.districtId, location.provinceId],
    );
    if (!rows.length) {
      throw new BadRequestException(
        'Tỉnh, quận/huyện và phường/xã không hợp lệ.',
      );
    }
  }
}
