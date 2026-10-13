import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// Login attempts are counted per (IP, email) instead of per IP, so staff sharing one shop network
// don't lock each other out while repeated guesses against one account are still limited.
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const body = req.body as { email?: unknown } | undefined;
    const email = req.path === '/auth/login' && typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    return Promise.resolve(`${String(req.ip)}|${email}`);
  }
}
