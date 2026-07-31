import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Province } from '../entities/province.entity';
import { District } from '../entities/district.entity';
import { Ward } from '../entities/ward.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Province)
    private readonly provinceRepo: Repository<Province>,

    @InjectRepository(District)
    private readonly districtRepo: Repository<District>,

    @InjectRepository(Ward)
    private readonly wardRepo: Repository<Ward>,
  ) {}

  findProvinces() {
    return this.provinceRepo.find({
      order: { id: 'ASC' },
    });
  }

  findDistricts(provinceId: number) {
    return this.districtRepo.find({
      where: { provinceId },
      order: { id: 'ASC' },
    });
  }

  findWards(districtId: number) {
    return this.wardRepo.find({
      where: { districtId },
      order: { id: 'ASC' },
    });
  }

  findWardsByProvince(provinceId: number) {
    return this.wardRepo
      .createQueryBuilder('ward')
      .innerJoin(District, 'district', 'district.id = ward.district_id')
      .where('district.province_id = :provinceId', { provinceId })
      .andWhere('ward.code IS NOT NULL')
      .orderBy('ward.name', 'ASC')
      .addOrderBy('ward.code', 'ASC')
      .getMany();
  }
}
