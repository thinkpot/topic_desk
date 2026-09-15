import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public: powers the pricing section and the billing page.
export async function GET() {
  const plans = await prisma.plan.findMany({
    where: { isPublic: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      priceINR: true,
      maxChatbots: true,
      maxMonthlyUsers: true,
      isPaid: true,
    },
  });
  return NextResponse.json({ plans });
}
