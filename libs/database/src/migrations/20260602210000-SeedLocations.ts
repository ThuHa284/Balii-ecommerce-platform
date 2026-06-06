import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedLocations20260602210000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO user_service.provinces (id, name, code)
      VALUES
      (1, 'TP. Hồ Chí Minh', 'HCM'),
      (2, 'Hà Nội', 'HN'),
      (3, 'Đà Nẵng', 'DN')
      ON CONFLICT DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO user_service.districts (id, province_id, name)
      VALUES
      (1, 1, 'Quận 1'),
      (2, 1, 'Quận 3'),
      (3, 2, 'Quận Hoàn Kiếm'),
      (4, 3, 'Quận Hải Châu')
      ON CONFLICT DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO user_service.wards (id, district_id, name)
      VALUES
      (1, 1, 'Phường Bến Nghé'),
      (2, 1, 'Phường Bến Thành'),
      (3, 2, 'Phường Võ Thị Sáu'),
      (4, 3, 'Phường Hàng Trống'),
      (5, 4, 'Phường Hải Châu I')
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM user_service.wards WHERE id BETWEEN 1 AND 5;`);
    await queryRunner.query(`DELETE FROM user_service.districts WHERE id BETWEEN 1 AND 4;`);
    await queryRunner.query(`DELETE FROM user_service.provinces WHERE id BETWEEN 1 AND 3;`);
  }
}