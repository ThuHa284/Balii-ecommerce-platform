import { MigrationInterface, QueryRunner } from 'typeorm';

import {
  VIETNAM_PROVINCES,
  VIETNAM_WARDS,
} from './data/vietnam-administrative-units';

const INTERNAL_DISTRICT_NAME = '[Hệ thống] Đơn vị hành chính hai cấp';
const INSERT_BATCH_SIZE = 400;

// Giữ nguyên ID tỉnh/thành đang được dùng bởi user_addresses trên hệ thống.
const PROVINCE_ID_BY_CODE: Readonly<Record<string, number>> = {
  '01': 1,
  '31': 2,
  '46': 3,
  '48': 4,
  '79': 5,
  '92': 6,
  '08': 7,
  '15': 8,
  '19': 9,
  '25': 10,
  '24': 11,
  '33': 12,
  '37': 13,
  '38': 14,
  '40': 15,
  '42': 16,
  '44': 17,
  '51': 18,
  '52': 19,
  '56': 20,
  '68': 21,
  '66': 22,
  '75': 23,
  '80': 24,
  '82': 25,
  '86': 26,
  '91': 27,
  '96': 28,
  '12': 29,
  '11': 30,
  '14': 31,
  '20': 32,
  '22': 33,
  '04': 34,
};

export class SeedTwoTierVietnamLocations20260731130000 implements MigrationInterface {
  name = 'SeedTwoTierVietnamLocations20260731130000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_service.wards
      ADD COLUMN IF NOT EXISTS code VARCHAR(5);
    `);

    const provinceParameters: Array<number | string> = [];
    const provinceValues = VIETNAM_PROVINCES.map(([code, name], index) => {
      const id = PROVINCE_ID_BY_CODE[code];
      if (!id) {
        throw new Error(`Chưa cấu hình ID nội bộ cho tỉnh/thành mã ${code}.`);
      }

      provinceParameters.push(id, name, code);
      const offset = index * 3;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
    }).join(',\n');

    await queryRunner.query(
      `
      INSERT INTO user_service.provinces (id, name, code)
      VALUES ${provinceValues}
      ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          code = EXCLUDED.code;
      `,
      provinceParameters,
    );

    await queryRunner.query(`
      SELECT setval(
        pg_get_serial_sequence('user_service.provinces', 'id'),
        (SELECT MAX(id) FROM user_service.provinces),
        TRUE
      );

      CREATE UNIQUE INDEX IF NOT EXISTS uq_user_provinces_official_code
      ON user_service.provinces (code);

      CREATE INDEX IF NOT EXISTS idx_user_districts_province_id
      ON user_service.districts (province_id);

      CREATE INDEX IF NOT EXISTS idx_user_wards_district_id
      ON user_service.wards (district_id);

      CREATE UNIQUE INDEX IF NOT EXISTS uq_user_wards_official_code
      ON user_service.wards (code);
    `);

    await queryRunner.query(
      `
      INSERT INTO user_service.districts (province_id, name)
      SELECT province.id, $1::varchar
      FROM user_service.provinces province
      WHERE NOT EXISTS (
        SELECT 1
        FROM user_service.districts district
        WHERE district.province_id = province.id
          AND district.name = $1::varchar
      );
      `,
      [INTERNAL_DISTRICT_NAME],
    );

    for (
      let batchStart = 0;
      batchStart < VIETNAM_WARDS.length;
      batchStart += INSERT_BATCH_SIZE
    ) {
      const batch = VIETNAM_WARDS.slice(
        batchStart,
        batchStart + INSERT_BATCH_SIZE,
      );
      const parameters: string[] = [];
      const values = batch
        .map(([code, provinceCode, name], index) => {
          parameters.push(code, provinceCode, name);
          const offset = index * 3;
          return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
        })
        .join(',\n');

      await queryRunner.query(
        `
        WITH incoming(code, province_code, name) AS (
          VALUES ${values}
        )
        INSERT INTO user_service.wards (district_id, name, code)
        SELECT district.id, incoming.name, incoming.code
        FROM incoming
        JOIN user_service.provinces province
          ON province.code = incoming.province_code
        JOIN user_service.districts district
          ON district.province_id = province.id
         AND district.name = $${parameters.length + 1}
        ON CONFLICT (code) DO UPDATE
        SET district_id = EXCLUDED.district_id,
            name = EXCLUDED.name;
        `,
        [...parameters, INTERNAL_DISTRICT_NAME],
      );
    }

    const importedWardRows = (await queryRunner.query(
      `
      SELECT COUNT(*)::text AS count
      FROM user_service.wards
      WHERE code = ANY($1::varchar[]);
      `,
      [VIETNAM_WARDS.map(([code]) => code)],
    )) as Array<{ count: string }>;
    const importedWardCount = Number(importedWardRows[0]?.count ?? 0);
    if (importedWardCount !== VIETNAM_WARDS.length) {
      throw new Error(
        `Chỉ nhập được ${importedWardCount}/${VIETNAM_WARDS.length} phường/xã.`,
      );
    }

    await queryRunner.query(`
      SELECT setval(
        pg_get_serial_sequence('user_service.districts', 'id'),
        (SELECT MAX(id) FROM user_service.districts),
        TRUE
      );

      SELECT setval(
        pg_get_serial_sequence('user_service.wards', 'id'),
        (SELECT MAX(id) FROM user_service.wards),
        TRUE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const usedWardRows = (await queryRunner.query(`
      SELECT COUNT(*)::text AS count
      FROM user_service.user_addresses address
      JOIN user_service.wards ward ON ward.id = address.ward_id
      WHERE ward.code IS NOT NULL;
    `)) as Array<{ count: string }>;
    if (Number(usedWardRows[0]?.count ?? 0) > 0) {
      throw new Error(
        'Không thể gỡ dữ liệu hành chính vì đã có địa chỉ khách hàng sử dụng.',
      );
    }

    await queryRunner.query(`
      DELETE FROM user_service.wards
      WHERE code IS NOT NULL;
    `);

    await queryRunner.query(
      `
      DELETE FROM user_service.districts district
      WHERE district.name = $1
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
      `,
      [INTERNAL_DISTRICT_NAME],
    );

    await queryRunner.query(`
      DROP INDEX IF EXISTS user_service.uq_user_wards_official_code;
      ALTER TABLE user_service.wards DROP COLUMN IF EXISTS code;
    `);
  }
}
