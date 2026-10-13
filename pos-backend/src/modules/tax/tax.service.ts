import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class TaxService {
  constructor(private readonly prisma: PrismaService) {}

  // คำนวณภาษี (VAT) แยกออกมาเป็น service กลาง
}
