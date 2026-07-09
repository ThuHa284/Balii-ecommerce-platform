import { Injectable, NotFoundException } from '@nestjs/common';
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
    console.log('========== CREATE ADDRESS ==========');
    console.log('USER ID:', userId);
    console.log('DTO:', dto);

    const count = await this.addressRepo.count({
      where: { userId },
    });

    console.log('ADDRESS COUNT:', count);

    const address = this.addressRepo.create({
      userId,
      ...dto,
      isDefault: count === 0,
    });

    console.log('ADDRESS ENTITY:', address);

    const savedAddress = await this.addressRepo.save(address);

    console.log('SAVED ADDRESS:', savedAddress);
    console.log('===================================');

    return savedAddress;
  }

  async update(userId: string, id: string, dto: UpdateAddressDto) {
    const address = await this.addressRepo.findOne({
      where: { id, userId },
    });

    if (!address) {
      throw new NotFoundException('Không tìm thấy địa chỉ');
    }

    Object.assign(address, dto);
    return this.addressRepo.save(address);
  }

  async remove(userId: string, id: string) {
    const address = await this.addressRepo.findOne({
      where: { id, userId },
    });

    if (!address) {
      throw new NotFoundException('Không tìm thấy địa chỉ');
    }

    await this.addressRepo.remove(address);

    return {
      message: 'Xóa địa chỉ thành công',
    };
  }

  async setDefault(userId: string, id: string) {
    return this.dataSource.transaction(async (manager) => {
      const address = await manager.findOne(UserAddress, {
        where: { id, userId },
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
}
