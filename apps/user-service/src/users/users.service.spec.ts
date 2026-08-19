/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { RedisService } from '@app/redis';
import { Repository } from 'typeorm';

import { Role } from '../entities/role.entity';
import { User } from '../entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const actingUser = {
    id: 'acting-user',
    role: { id: 1, name: 'SUPER_ADMIN' },
  } as User;
  const targetUser = {
    id: 'target-user',
    roleId: 3,
    role: { id: 3, name: 'CUSTOMER' },
  } as User;
  const superAdminRole = { id: 1, name: 'SUPER_ADMIN' } as Role;
  const updatedUser = {
    ...targetUser,
    roleId: 1,
    role: superAdminRole,
  };

  const userRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<Repository<User>>;
  const roleRepo = {
    findOne: jest.fn(),
  } as unknown as jest.Mocked<Repository<Role>>;
  const redis = {
    del: jest.fn(),
    set: jest.fn(),
  } as unknown as jest.Mocked<RedisService>;
  const service = new UsersService(userRepo, roleRepo, redis);

  beforeEach(() => {
    jest.clearAllMocks();
    userRepo.findOne
      .mockResolvedValueOnce(actingUser)
      .mockResolvedValueOnce(targetUser)
      .mockResolvedValueOnce(updatedUser);
    roleRepo.findOne.mockResolvedValue(superAdminRole);
    userRepo.update.mockResolvedValue({
      affected: 1,
      raw: [],
      generatedMaps: [],
    });
    redis.del.mockResolvedValue(1);
    redis.set.mockResolvedValue('OK');
  });

  it('updates the role join column directly instead of saving a stale relation', async () => {
    const result = await service.updateUserRole(
      actingUser.id,
      targetUser.id,
      'super_admin',
    );

    expect(userRepo.update).toHaveBeenCalledWith(targetUser.id, {
      roleId: superAdminRole.id,
    });
    expect(redis.del).toHaveBeenCalledWith(`refresh_token:${targetUser.id}`);
    expect(result?.role.name).toBe('SUPER_ADMIN');
  });
});
