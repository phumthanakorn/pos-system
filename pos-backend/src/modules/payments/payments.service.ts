import { Injectable } from '@nestjs/common';
import { buildPromptPayPayload, detectPromptPayKind } from '../../common/helpers/promptpay.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  // The QR payload for this shop's PromptPay account and the given amount (null when not set up yet).
  async promptPay(shopId: number, amount: number) {
    const row = await this.prisma.setting.findUnique({ where: { shopId_key: { shopId, key: 'promptpay_id' } } });
    const id = row?.value ?? '';
    if (!id || !detectPromptPayKind(id)) {
      return { configured: false, payload: null };
    }
    return { configured: true, payload: buildPromptPayPayload(id, amount) };
  }
}
