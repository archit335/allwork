import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "./db";

type Tx = PrismaClient | Prisma.TransactionClient;

export async function notify(
  userId: string,
  n: { type: string; title: string; body: string; link?: string },
  tx: Tx = db,
) {
  return tx.notification.create({ data: { userId, ...n } });
}

export async function notifyMany(
  userIds: string[],
  n: { type: string; title: string; body: string; link?: string },
  tx: Tx = db,
) {
  if (!userIds.length) return;
  await tx.notification.createMany({ data: userIds.map((userId) => ({ userId, ...n })) });
}
