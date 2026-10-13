import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { SetupShopDto } from './dto/setup-shop.dto.js';

interface SessionUser {
  id: number;
  shopId: number | null;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingEmail = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingEmail) {
      throw new ConflictException('อีเมลนี้ถูกใช้สมัครไปแล้ว');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        shopId: null,
        name: dto.name,
        email: dto.email,
        username: dto.username,
        password: passwordHash,
        role: 'owner',
      },
    });

    return {
      user: { id: user.id, name: user.name, email: user.email, username: user.username, role: user.role },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { shop: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildSession(
      { id: user.id, shopId: user.shopId, email: user.email, role: user.role },
      { id: user.id, name: user.name, email: user.email, username: user.username, role: user.role },
      user.shop,
    );
  }

  // Current account straight from the database (the JwtStrategy already verified the token and
  // loaded the user), so the frontend never has to trust or cache a role it stored itself.
  async me(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { shop: true } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }
    return {
      user: { id: user.id, name: user.name, email: user.email, username: user.username, role: user.role },
      shop: user.shop ? { id: user.shop.id, name: user.shop.name, slug: user.shop.slug } : null,
    };
  }

  async setupShop(currentUser: { id: number }, dto: SetupShopDto) {
    const user = await this.prisma.user.findUnique({ where: { id: currentUser.id } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.shopId) {
      throw new ConflictException('ผู้ใช้นี้ตั้งค่าร้านไปแล้ว');
    }

    const slug = await this.generateUniqueSlug(dto.shopName);

    const { shop, updatedUser } = await this.prisma.$transaction(async (tx) => {
      const shop = await tx.shop.create({
        data: {
          name: dto.shopName,
          slug,
          type: dto.type,
          hasDineIn: dto.hasDineIn,
          phone: dto.phone,
          address: dto.address,
          logoAbbr: dto.logoAbbr,
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { shopId: shop.id },
      });

      return { shop, updatedUser };
    });

    return this.buildSession(
      { id: updatedUser.id, shopId: updatedUser.shopId, email: updatedUser.email, role: updatedUser.role },
      {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        username: updatedUser.username,
        role: updatedUser.role,
      },
      shop,
    );
  }

  private async buildSession(
    sessionUser: SessionUser,
    user: { id: number; name: string; email: string; username: string; role: string },
    shop: { id: number; name: string; slug: string } | null,
  ) {
    const payload = { sub: sessionUser.id, shopId: sessionUser.shopId, email: sessionUser.email, role: sessionUser.role };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user,
      shop: shop ? { id: shop.id, name: shop.name, slug: shop.slug } : null,
    };
  }

  private async generateUniqueSlug(shopName: string): Promise<string> {
    const base =
      shopName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9ก-๙\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'shop';

    let slug = base;
    let suffix = 1;
    while (await this.prisma.shop.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${base}-${suffix}`;
    }
    return slug;
  }
}
