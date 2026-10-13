import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Role, type User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';

export interface Actor {
  id: number;
  role: string;
}

function toView(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role,
    isActive: user.isActive,
  };
}

function mapWriteError(error: unknown): Error {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return new ConflictException('อีเมลหรือชื่อผู้ใช้นี้ถูกใช้แล้ว');
  }
  return error instanceof Error ? error : new Error(String(error));
}

// owner manages everyone but owners; manager manages cashiers only
function canManage(actorRole: string, targetRole: Role): boolean {
  if (targetRole === 'owner') return false;
  if (actorRole === 'owner') return true;
  return actorRole === 'manager' && targetRole === 'cashier';
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(shopId: number) {
    const users = await this.prisma.user.findMany({ where: { shopId }, orderBy: { id: 'asc' } });
    return users.map(toView);
  }

  async create(shopId: number, actor: Actor, dto: CreateStaffDto) {
    if (!canManage(actor.role, dto.role)) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์สร้างพนักงานระดับนี้');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      const user = await this.prisma.user.create({
        data: {
          shopId,
          name: dto.name.trim(),
          email: dto.email.trim().toLowerCase(),
          username: dto.username.trim(),
          password: passwordHash,
          role: dto.role,
        },
      });
      return toView(user);
    } catch (error) {
      throw mapWriteError(error);
    }
  }

  async update(shopId: number, actor: Actor, id: number, dto: UpdateStaffDto) {
    const target = await this.prisma.user.findFirst({ where: { id, shopId } });
    if (!target) {
      throw new NotFoundException('ไม่พบพนักงาน');
    }
    if (!canManage(actor.role, target.role)) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์แก้ไขพนักงานคนนี้');
    }
    if (dto.role !== undefined && !canManage(actor.role, dto.role)) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์กำหนดระดับนี้');
    }
    if (id === actor.id && (dto.role !== undefined || dto.isActive === false)) {
      throw new ForbiddenException('ไม่สามารถเปลี่ยนสิทธิ์หรือปิดบัญชีของตัวเองได้');
    }
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.password !== undefined && { password: await bcrypt.hash(dto.password, 10) }),
      },
    });
    return toView(user);
  }
}
