import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("response" in auth) return auth.response;

  const status = req.nextUrl.searchParams.get("status") === "all" ? undefined : "PENDING";
  const requests = await prisma.upgradeRequest.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: status ? "asc" : "desc" },
    take: 100,
    include: {
      plan: { select: { id: true, name: true, priceINR: true, priceYearlyINR: true } },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          companyName: true,
          websiteUrl: true,
          planExpiresAt: true,
          plan: { select: { name: true, slug: true } },
        },
      },
    },
  });
  return NextResponse.json({ requests });
}
