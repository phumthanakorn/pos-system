import type { Prisma } from '@prisma/client';

// Atomic per-shop counter. LAST_INSERT_ID(expr) makes the increment and the read one operation on the
// same connection, and the row stays locked until the surrounding transaction commits, so concurrent
// callers never get the same number and a rolled-back transaction gives its number back.
export async function nextSequence(
  tx: Prisma.TransactionClient,
  shopId: number,
  kind: string,
  period: string,
): Promise<number> {
  await tx.$executeRaw`
    INSERT INTO document_counters (shop_id, kind, day, last_seq)
    VALUES (${shopId}, ${kind}, ${period}, LAST_INSERT_ID(1))
    ON DUPLICATE KEY UPDATE last_seq = LAST_INSERT_ID(last_seq + 1)`;
  const rows = await tx.$queryRaw<{ seq: bigint }[]>`SELECT LAST_INSERT_ID() AS seq`;
  return Number(rows[0]?.seq ?? 1);
}
