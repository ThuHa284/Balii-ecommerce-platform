import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserAddress } from '../entities/user-address.entity';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(UserAddress)
    private addressRepo: Repository<UserAddress>,
  ) {}

  findByUser(userId: string) {
    return this.addressRepo.find({
      where: { userId },
    });
  }

  create(userId: string, dto: any) {
    const address = this.addressRepo.create({
      ...dto,
      userId,
    });

    return this.addressRepo.save(address);
  }

  async update(userId: string, addressId: string, dto: any) {
    const address = await this.addressRepo.findOne({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundException('Không tìm thấy địa chỉ');
    }

    Object.assign(address, dto);

    return this.addressRepo.save(address);
  }

  async delete(userId: string, addressId: string) {
    const result = await this.addressRepo.delete({
      id: addressId,
      userId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Không tìm thấy địa chỉ');
    }

    return { message: 'Xóa địa chỉ thành công' };
  }
}