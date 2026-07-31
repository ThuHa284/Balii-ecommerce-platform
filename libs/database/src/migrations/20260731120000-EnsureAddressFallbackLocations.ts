import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureAddressFallbackLocations20260731120000 implements MigrationInterface {
  name = 'EnsureAddressFallbackLocations20260731120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO user_service.districts (province_id, name)
      SELECT province.id, '[Hệ thống] Đơn vị hành chính hai cấp'
      FROM user_service.provinces province
      WHERE NOT EXISTS (
        SELECT 1
        FROM user_service.districts district
        WHERE district.province_id = province.id
      );

      INSERT INTO user_service.wards (district_id, name)
      SELECT district.id, '[Hệ thống] Phường/xã nhập thủ công'
      FROM user_service.districts district
      WHERE district.name = '[Hệ thống] Đơn vị hành chính hai cấp'
        AND NOT EXISTS (
          SELECT 1
          FROM user_service.wards ward
          WHERE ward.district_id = district.id
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM user_service.wards ward
      WHERE ward.name = '[Hệ thống] Phường/xã nhập thủ công'
        AND NOT EXISTS (
          SELECT 1
          FROM user_service.user_addresses address
          WHERE address.ward_id = ward.id
        );

      DELETE FROM user_service.districts district
      WHERE district.name = '[Hệ thống] Đơn vị hành chính hai cấp'
        AND NOT EXISTS (
          SELECT 1
          FROM user_service.wards ward
          WHERE ward.district_id = district.id
        )
        AND NOT EXISTS (
          SELECT 1
          FROM user_service.user_addresses address
          WHERE address.district_id = district.id
        );
    `);
  }
}
