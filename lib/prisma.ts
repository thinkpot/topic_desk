import { PrismaClient } from "@prisma/client";

// Reused across warm serverless invocations (and dev hot-reloads) so we don't
// exhaust Postgres connections by creating a new client per request.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
